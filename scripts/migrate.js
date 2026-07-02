/**
 * Migration SQLite — crée data/notaria.db, applique schema + seed.
 * Usage : npm run db:migrate
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.join(__dirname, "..");
const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, "data", "notaria.db");

function runSql(db, file) {
  const sql = fs.readFileSync(path.join(ROOT, file), "utf8");
  console.log(`→ ${file}`);
  db.exec(sql);
}

function writeEnv() {
  if (process.env.JWT_SECRET || process.env.RENDER || process.env.NODE_ENV === "production") return;
  const jwt = crypto.randomBytes(32).toString("hex");
  const relPath = path.relative(ROOT, DB_PATH).replace(/\\/g, "/");
  fs.writeFileSync(
    path.join(ROOT, ".env"),
    `# Généré par npm run db:migrate\nDATABASE_PATH=${relPath}\nJWT_SECRET=${jwt}\n`,
    "utf8"
  );
  console.log("→ .env créé");
}

function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const exists = fs.existsSync(DB_PATH);
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  runSql(db, "db/schema.sql");
  runSql(db, "db/seed.sql");

  writeEnv();
  console.log("\n✅ Migration SQLite terminée.");
  console.log(`   Fichier : ${DB_PATH}`);
  console.log(`   ${exists ? "Base existante mise à jour (INSERT OR IGNORE)." : "Nouvelle base créée."}`);
}

main();
