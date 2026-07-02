/**
 * Migration — PostgreSQL si DATABASE_URL, sinon SQLite local.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");

async function migratePg() {
  const { Client } = require("pg");
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url.includes("render.com") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  console.log("→ PostgreSQL (production)");
  for (const file of ["db/schema.pg.sql", "db/seed.pg.sql"]) {
    console.log(`→ ${file}`);
    await client.query(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }
  await client.end();
  console.log("\n✅ Migration PostgreSQL terminée.");
}

function migrateSqlite() {
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
  if (!process.env.JWT_SECRET && !process.env.RENDER && process.env.NODE_ENV !== "production") {
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
