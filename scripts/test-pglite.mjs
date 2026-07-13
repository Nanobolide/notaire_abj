import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { initializeDatabase } from "../src/lib/db-init.js";

const dataDir = path.join(process.cwd(), "data", "pglite-test");
if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const db = new PGlite(dataDir);
try {
  await initializeDatabase(db);
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exit(1);
}

const users = await db.query(`SELECT identifiant, role FROM utilisateurs ORDER BY identifiant`);
console.log("Comptes:", users.rows);

const auth = await db.query(`SELECT * FROM auth_lookup($1)`, ["notaire"]);
console.log("auth_lookup(notaire):", auth.rows[0] ? "OK" : "ECHEC");

const actes = await db.query(`SELECT count(*)::int AS n FROM actes`);
const appels = await db.query(`SELECT count(*)::int AS n FROM appels_courriers`);
console.log(`Démo: ${actes.rows[0].n} actes, ${appels.rows[0].n} appels`);

fs.rmSync(dataDir, { recursive: true, force: true });
console.log("✅ Test PGlite OK");
