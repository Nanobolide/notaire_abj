import pool from "@/lib/db";
/** Lit un réglage plateforme, avec valeur par défaut si absent. */
export async function reglage(cle, defaut = null) {
  try {
    const { rows: [r] } = await pool.query(`SELECT valeur FROM reglages_plateforme WHERE cle = $1`, [cle]);
    return r ? r.valeur : defaut;
  } catch { return defaut; }
}
