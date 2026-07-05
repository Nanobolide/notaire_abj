/**
 * TEST D'ISOLATION MULTI-ÉTUDES — exigence critique pour un cabinet notarial.
 * Vérifie que les requêtes applicatives (filtre etude_id) empêchent toute fuite
 * entre études. Compatible SQLite (local) et PostgreSQL (production Render).
 * npm run test:isolation
 */
const path = require("path");
const { randomUUID } = require("crypto");

const isPg = !!process.env.DATABASE_URL;
const A = "11111111-1111-1111-1111-111111111111";
const B = "bbbbbbbb-0000-0000-0000-000000000002";

async function getClient() {
  if (isPg) {
    const { Pool } = require("pg");
    const url = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString: url,
      ssl: url.includes("render.com") ? { rejectUnauthorized: false } : undefined,
    });
    return { pool, query: (sql, p) => pool.query(sql, p), end: () => pool.end() };
  }
  const { DatabaseSync } = require("node:sqlite");
  const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "notaria.db");
  const db = new DatabaseSync(DB_PATH);
  const query = (sql, params = []) => {
    const bound = params.map((p) => (p === undefined ? null : p));
    const expanded = [];
    const s = sql.replace(/\$(\d+)/g, (_, n) => {
      expanded.push(bound[parseInt(n, 10) - 1]);
      return "?";
    });
    const head = sql.trim().split(/\s+/)[0].toUpperCase();
    if (head === "SELECT" || /RETURNING/i.test(sql)) {
      const rows = db.prepare(s).all(...expanded);
      return { rows, rowCount: rows.length };
    }
    const info = db.prepare(s).run(...expanded);
    return { rows: [], rowCount: info.changes };
  };
  return { db, query, end: () => {} };
}

function insertAppel(query, etudeId, clientNom) {
  const id = randomUUID();
  if (isPg) {
    return query(
      `INSERT INTO appels_courriers (etude_id, numero, type_flux, client_nom)
       VALUES ($1, (SELECT COALESCE(MAX(numero),0)+1 FROM appels_courriers WHERE etude_id = $1), 'Appel Téléphonique', $2)
       RETURNING id`,
      [etudeId, clientNom]
    );
  }
  return query(
    `INSERT INTO appels_courriers (id, etude_id, numero, type_flux, client_nom)
     VALUES ($1, $2,
       (SELECT COALESCE(MAX(numero),0)+1 FROM appels_courriers WHERE etude_id = $2),
       'Appel Téléphonique', $3)
     RETURNING id`,
    [id, etudeId, clientNom]
  );
}

(async () => {
  const { query, end } = await getClient();
  let echecs = 0;
  const ok = (m) => console.log("  ✅ " + m);
  const ko = (m) => { console.error("  ❌ FUITE : " + m); echecs++; };

  console.log(isPg ? "→ Test sur PostgreSQL" : "→ Test sur SQLite");

  if (isPg) {
    await query(
      `INSERT INTO etudes (id, nom) VALUES ($1,'Étude Bêta test') ON CONFLICT DO NOTHING`,
      [B]
    );
  } else {
    await query(`INSERT OR IGNORE INTO etudes (id, nom) VALUES ($1, $2)`, [B, "Étude Bêta test"]);
  }

  await insertAppel(query, A, "Client ALPHA isolation");
  await insertAppel(query, B, "Client BÊTA isolation");

  console.log("Test 1 — lecture filtrée par etude_id :");
  const { rows: lusA } = await query(
    `SELECT client_nom FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL`,
    [A]
  );
  if (lusA.some((r) => r.client_nom.includes("BÊTA"))) ko("L'étude A voit des données de B.");
  else ok(`Étude A ne voit que ses lignes (${lusA.length} entrée(s)).`);

  console.log("Test 2 — modification croisée (WHERE etude_id = session) :");
  const { rows: betaRows } = await query(
    `SELECT id FROM appels_courriers WHERE etude_id = $1 AND client_nom LIKE '%BÊTA%' LIMIT 1`,
    [B]
  );
  if (betaRows[0]) {
    const { rowCount } = await query(
      `UPDATE appels_courriers SET observations = 'PIRATÉ' WHERE id = $1 AND etude_id = $2`,
      [betaRows[0].id, A]
    );
    if (rowCount > 0) ko("Modification d'une ligne d'une autre étude possible.");
    else ok("Aucune ligne d'une autre étude modifiable (0 ligne touchée).");
  } else ok("Pas de ligne Bêta à tester (ignoré).");

  console.log("Test 3 — suppression logique croisée :");
  if (betaRows[0]) {
    const nowSql = isPg ? "now()" : "datetime('now')";
    const { rowCount } = await query(
      `UPDATE appels_courriers SET supprime_le = ${nowSql} WHERE id = $1 AND etude_id = $2`,
      [betaRows[0].id, A]
    );
    if (rowCount > 0) ko("Suppression logique d'une autre étude possible.");
    else ok("Suppression logique d'une autre étude refusée.");
  }

  await end();
  if (echecs > 0) {
    console.error(`\n${echecs} fuite(s) — LIVRAISON BLOQUÉE.`);
    process.exit(1);
  }
  console.log("\nIsolation vérifiée : aucune fuite entre études.");
})().catch((e) => { console.error("Erreur du test :", e.message); process.exit(1); });
