/** Vérifie la connexion PostgreSQL (lecture seule). Usage : DATABASE_URL=... node scripts/check-pg.js */
const { Client } = require("pg");
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL manquant"); process.exit(1); }

(async () => {
  const c = new Client({
    connectionString: url,
    ssl: url.includes("render.com") ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();
  console.log("✅ Connexion PostgreSQL OK");
  const tables = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"
  );
  console.log("Tables:", tables.rows.map((r) => r.table_name).join(", ") || "(aucune)");
  try {
    const users = await c.query("SELECT identifiant, role FROM utilisateurs ORDER BY identifiant");
    console.log("Comptes seed:", users.rows);
  } catch (e) {
    console.log("Table utilisateurs absente — migration pas encore exécutée.");
  }
  await c.end();
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
