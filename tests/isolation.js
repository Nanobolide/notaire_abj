/**
 * TEST D'ISOLATION MULTI-TENANT — exigence critique n°1.
 * Crée deux études fictives (Alpha, Bêta), insère une donnée dans chacune,
 * puis vérifie qu'une session armée sur Alpha ne peut JAMAIS lire ni écrire Bêta.
 * À exécuter avec le rôle applicatif (non superuser) : npm run test:isolation
 * Le processus sort en erreur (code 1) à la moindre fuite — critère bloquant de recette.
 */
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function tenant(client, etudeId) {
  await client.query("SELECT set_config('app.current_etude_id', $1, true)", [etudeId]);
}

(async () => {
  const A = "aaaaaaaa-0000-0000-0000-000000000001";
  const B = "bbbbbbbb-0000-0000-0000-000000000002";

  // Les études fictives sont créées via une connexion admin (le rôle applicatif
  // n'a volontairement AUCUN droit d'écriture sur la table etudes).
  const adminUrl = process.env.ADMIN_DATABASE_URL;
  if (adminUrl) {
    const admin = new Pool({ connectionString: adminUrl });
    await admin.query(`INSERT INTO etudes (id, nom) VALUES ($1,'Étude Alpha'),($2,'Étude Bêta')
                       ON CONFLICT DO NOTHING`, [A, B]);
    await admin.end();
  }

  const c = await pool.connect();
  let echecs = 0;
  const ok = (m) => console.log("  ✅ " + m);
  const ko = (m) => { console.error("  ❌ FUITE : " + m); echecs++; };
  try {
    await c.query("BEGIN");

    // Une entrée dans chaque étude (session armée sur la bonne étude à chaque fois)
    await tenant(c, A);
    await c.query(`INSERT INTO appels_courriers (etude_id, numero, type_flux, client_nom)
                   VALUES ($1, 1, 'Appel Téléphonique', 'Client ALPHA')`, [A]);
    await tenant(c, B);
    await c.query(`INSERT INTO appels_courriers (etude_id, numero, type_flux, client_nom)
                   VALUES ($1, 1, 'Appel Téléphonique', 'Client BÊTA')`, [B]);

    console.log("Test 1 — lecture croisée :");
    await tenant(c, A);
    const { rows } = await c.query(`SELECT client_nom FROM appels_courriers`);
    if (rows.some((r) => r.client_nom.includes("BÊTA"))) ko("Alpha voit les données de Bêta.");
    else ok("Alpha ne voit que ses propres données (" + rows.length + " ligne(s)).");

    console.log("Test 2 — écriture croisée :");
    await c.query("SAVEPOINT intrusion");
    try {
      await c.query(`INSERT INTO appels_courriers (etude_id, numero, type_flux, client_nom)
                     VALUES ($1, 99, 'Appel Téléphonique', 'INTRUSION')`, [B]);
      ko("Alpha a pu écrire dans Bêta.");
    } catch {
      ok("Écriture dans une autre étude refusée par le moteur.");
      await c.query("ROLLBACK TO SAVEPOINT intrusion");
    }

    console.log("Test 3 — modification croisée :");
    const upd = await c.query(`UPDATE appels_courriers SET observations = 'PIRATÉ'
                               WHERE etude_id = $1 RETURNING id`, [B]);
    if (upd.rowCount > 0) ko("Alpha a modifié des lignes de Bêta.");
    else ok("Aucune ligne d'une autre étude modifiable (0 ligne touchée).");

    await c.query("ROLLBACK"); // rien ne persiste
  } finally {
    c.release(); await pool.end();
  }
  if (echecs > 0) { console.error(`\n${echecs} fuite(s) détectée(s) — LIVRAISON BLOQUÉE.`); process.exit(1); }
  console.log("\nIsolation vérifiée : aucune fuite entre études.");
})().catch((e) => { console.error("Erreur du test :", e.message); process.exit(1); });
