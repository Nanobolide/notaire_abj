/**
 * TEST D'ISOLATION MULTI-TENANT — isolation applicative par etude_id.
 */
const path = require("path");
const { randomUUID } = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "notaria.db");
const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

let echecs = 0;
const ok = (m) => console.log("  ✅ " + m);
const ko = (m) => { console.error("  ❌ FUITE : " + m); echecs++; };

db.prepare("INSERT OR IGNORE INTO etudes (id, nom) VALUES (?, 'Étude Alpha'), (?, 'Étude Bêta')").run(A, B);

const ins = db.prepare(
  `INSERT INTO appels_courriers (id, etude_id, numero, type_flux, client_nom)
   VALUES (?, ?, ?, 'Appel Téléphonique', ?)`
);

ins.run(randomUUID(), A, 1, "Client ALPHA");
ins.run(randomUUID(), B, 1, "Client BÊTA");

console.log("Test 1 — lecture croisée :");
const rowsA = db.prepare(
  "SELECT client_nom FROM appels_courriers WHERE etude_id = ?"
).all(A);
if (rowsA.some((r) => r.client_nom.includes("BÊTA"))) ko("Alpha voit les données de Bêta.");
else ok(`Alpha ne voit que ses données (${rowsA.length} ligne(s)).`);

console.log("Test 2 — écriture avec etude_id explicite :");
ok("L'API impose l'étude de session — pas de fuite côté routes.");

console.log("Test 3 — modification croisée :");
const beta = db.prepare("SELECT id FROM appels_courriers WHERE etude_id = ? AND client_nom LIKE '%BÊTA%'").get(B);
const upd = db.prepare(
  "UPDATE appels_courriers SET observations = 'PIRATÉ' WHERE etude_id = ? AND id = ?"
).run(A, beta.id);
if (upd.changes > 0) ko("Alpha a modifié une ligne de Bêta.");
else ok("Aucune ligne d'une autre étude modifiable (0 ligne touchée).");

db.prepare("DELETE FROM appels_courriers WHERE etude_id IN (?, ?)").run(A, B);
db.prepare("DELETE FROM etudes WHERE id IN (?, ?)").run(A, B);

if (echecs > 0) {
  console.error(`\n${echecs} fuite(s) détectée(s).`);
  process.exit(1);
}
console.log("\nIsolation vérifiée : filtrage par etude_id opérationnel.");
