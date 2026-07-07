/**
 * Migration — PostgreSQL si DATABASE_URL (Render), sinon SQLite local.
 * Idempotent : CREATE IF NOT EXISTS / ON CONFLICT DO NOTHING.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pgSslOptions = require("./pg-ssl");

const ROOT = path.join(__dirname, "..");

async function connectWithRetry(client, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await client.connect();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      const wait = i * 2000;
      console.log(`→ Connexion PostgreSQL échouée (${i}/${attempts}) : ${err.message}`);
      console.log(`→ Nouvelle tentative dans ${wait / 1000}s…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function migratePg() {
  const bcrypt = require("bcryptjs");
  const { Client } = require("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant pour la migration PostgreSQL.");

  const client = new Client({ connectionString: url, ssl: pgSslOptions(url) });
  await connectWithRetry(client);
  console.log("→ PostgreSQL (production Render)");

  for (const file of ["db/schema.pg.sql", "db/seed.pg.sql"]) {
    const sql = fs.readFileSync(path.join(ROOT, file), "utf8");
    console.log(`→ ${file}`);
    try {
      await client.query(sql);
    } catch (err) {
      console.error(`Erreur dans ${file} :`, err.message);
      throw err;
    }
  }

  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_activite TIMESTAMPTZ`);

  // Mot de passe démo pour les comptes seed (test à distance Render)
  const hash = bcrypt.hashSync("ChangezMoi2026!", 10);
  await client.query(
    `UPDATE utilisateurs SET hash_mot_de_passe = $1
     WHERE identifiant IN ('notaire','secretariat','clerc1','accueil')`,
    [hash]
  );

  await client.end();
  console.log("\n✅ Migration PostgreSQL terminée.");
}

function migrateSqlite() {
  const bcrypt = require("bcryptjs");
  const { DatabaseSync } = require("node:sqlite");
  const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, "data", "notaria.db");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  console.log("→ SQLite (développement local)");
  for (const file of ["db/schema.sqlite.sql", "db/seed.sqlite.sql"]) {
    console.log(`→ ${file}`);
    db.exec(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN derniere_activite TEXT"); } catch {}
  const hash = bcrypt.hashSync("ChangezMoi2026!", 10);
  db.prepare(
    `UPDATE utilisateurs SET hash_mot_de_passe = ?
     WHERE identifiant IN ('notaire','secretariat','clerc1','accueil')`
  ).run(hash);
  if (!fs.existsSync(path.join(ROOT, ".env"))
    && !process.env.JWT_SECRET && !process.env.RENDER && process.env.NODE_ENV !== "production") {
    const jwt = crypto.randomBytes(32).toString("hex");
    const relPath = path.relative(ROOT, DB_PATH).replace(/\\/g, "/");
    fs.writeFileSync(path.join(ROOT, ".env"), `DATABASE_PATH=${relPath}\nJWT_SECRET=${jwt}\n`, "utf8");
    console.log("→ .env créé");
  }
  console.log(`\n✅ Migration SQLite terminée (${DB_PATH}).`);
}

(async () => {
  try {
    if (process.env.DATABASE_URL) await migratePg();
    else migrateSqlite();
  } catch (err) {
    console.error("Erreur migration :", err.message);
    process.exit(1);
  }
})();
