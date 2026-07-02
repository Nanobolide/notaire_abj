import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Exécute `fn(client)` dans une transaction où la Row-Level Security
 * est armée sur l'étude de la session (défense en profondeur, niveau 1) :
 * même une requête applicative buguée ne peut pas lire une autre étude.
 */
export async function withTenant(etudeId, fn) {
  const client = await pool.connect();
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

/** Journal d'audit inviolable : qui, quoi, quand, avant/après. */
export async function audit(client, { etudeId, table, ligneId, action, avant, apres, utilisateur }) {
  await client.query(
    `INSERT INTO audit_log (etude_id, table_cible, ligne_id, action, ancienne_valeur, nouvelle_valeur, utilisateur)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [etudeId, table, ligneId || null, action, avant ? JSON.stringify(avant) : null,
     apres ? JSON.stringify(apres) : null, utilisateur || null]
  );
}

export default pool;
