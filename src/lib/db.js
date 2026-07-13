import fs from "fs";
import path from "path";
import { Pool as PgPool } from "pg";
import { initializeDatabase } from "./db-init.js";

const usePglite = process.env.USE_PGLITE === "1" || !process.env.DATABASE_URL;

let poolInstance;
let initPromise;

function wrapResult(result) {
  return {
    rows: result.rows || [],
    rowCount: result.affectedRows ?? result.rows?.length ?? 0,
  };
}

function createPglitePool(db) {
  const query = async (sql, params) => wrapResult(await db.query(sql, params));

  return {
    query,
    connect: async () => {
      let inTx = false;
      return {
        query: async (sql, params) => {
          const head = sql.trim().split(/\s+/)[0].toUpperCase();
          if (head === "BEGIN") {
            if (!inTx) { await db.query("BEGIN"); inTx = true; }
            return { rows: [], rowCount: 0 };
          }
          if (head === "COMMIT") {
            if (inTx) { await db.query("COMMIT"); inTx = false; }
            return { rows: [], rowCount: 0 };
          }
          if (head === "ROLLBACK") {
            if (inTx) { await db.query("ROLLBACK"); inTx = false; }
            return { rows: [], rowCount: 0 };
          }
          return query(sql, params);
        },
        release: () => {},
      };
    },
  };
}

async function createPool() {
  if (usePglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = path.join(process.cwd(), "data", "pglite");
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new PGlite(dataDir);
    await initializeDatabase(db);
    return createPglitePool(db);
  }
  return new PgPool({ connectionString: process.env.DATABASE_URL });
}

async function getPool() {
  if (!initPromise) initPromise = createPool();
  if (!poolInstance) poolInstance = await initPromise;
  return poolInstance;
}

const poolProxy = {
  query: (...args) => getPool().then((p) => p.query(...args)),
  connect: () => getPool().then((p) => p.connect()),
};

/**
 * Exécute `fn(client)` dans une transaction où la Row-Level Security
 * est armée sur l'étude de la session.
 */
export async function withTenant(etudeId, fn) {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_etude_id', $1, true)", [etudeId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function etatCompte(uid) {
  const p = await getPool();
  const { rows } = await p.query(`SELECT * FROM compte_etat($1)`, [uid]);
  const r = rows[0];
  if (!r || r.ok !== true) return null;
  try { await p.query(`SELECT marquer_activite($1)`, [uid]); } catch {}
  return { niveauAcces: r.niveau_acces, fonction: r.fonction };
}

export async function audit(client, { etudeId, table, ligneId, action, avant, apres, utilisateur }) {
  await client.query(
    `INSERT INTO audit_log (etude_id, table_cible, ligne_id, action, ancienne_valeur, nouvelle_valeur, utilisateur)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [etudeId, table, ligneId || null, action, avant ? JSON.stringify(avant) : null,
      apres ? JSON.stringify(apres) : null, utilisateur || null]
  );
}

export default poolProxy;
export { poolProxy as pool };
