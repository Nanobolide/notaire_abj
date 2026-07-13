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

/**
 * C7 — Révocation immédiate : vérifie à CHAQUE requête que le compte est
 * toujours actif et non verrouillé. Un compte désactivé ou verrouillé pendant
 * une session voit son accès coupé instantanément, sans attendre l'expiration.
 * Utilise une fonction SECURITY DEFINER (la table utilisateurs est sous RLS).
 */
/**
 * C7 + C14 — Renvoie l'état COURANT du compte, lu en base à chaque requête :
 * actif/verrouillé, mais aussi le niveau d'accès et la fonction. Ainsi, désactiver
 * OU rétrograder un collaborateur prend effet immédiatement, sans attendre sa reconnexion.
 */
export async function etatCompte(uid) {
  const { rows } = await pool.query(`SELECT * FROM compte_etat($1)`, [uid]);
  const r = rows[0];
  if (!r || r.ok !== true) return null;
  try { await pool.query(`SELECT marquer_activite($1)`, [uid]); } catch {}
  return { niveauAcces: r.niveau_acces, fonction: r.fonction };
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
