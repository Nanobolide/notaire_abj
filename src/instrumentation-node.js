/**
 * Self-check au démarrage — remplace le silence des fallbacks try/catch de
 * src/lib/db.js et src/app/api/auth/login/route.js. Avant ce correctif, si les
 * fonctions SECURITY DEFINER ou la RLS manquaient en base, l'app retombait sans
 * bruit sur des requêtes directes (mode dégradé invisible — c'est précisément
 * ce qui s'est produit sur ce déploiement avant l'activation de la RLS).
 *
 * Ne bloque jamais le démarrage : ce n'est qu'un avertissement dans les logs.
 */
export async function runSelfCheck() {
  if (!process.env.DATABASE_URL) return; // SQLite dev : rien à vérifier ici

  const { Client } = require("pg");
  const pgSsl = /render\.com|sslmode=require|ssl=true/i.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false } : undefined;
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: pgSsl });

  const FONCTIONS_ATTENDUES = [
    "auth_lookup", "auth_apres_tentative", "compte_etat", "compte_est_actif",
    "marquer_activite", "deconnecter_presence", "purger_corbeille_expiree",
    "purger_registres_demo", "demande_recuperation_creer",
  ];
  const TABLES_RLS_ATTENDUES = [
    "utilisateurs", "appels_courriers", "actes", "acte_parties", "pieces_log",
    "audit_log", "exports", "referentiels", "parametres_etude", "demandes_recuperation",
  ];

  const alertes = [];
  try {
    await client.connect();

    const { rows: fonctions } = await client.query(
      `SELECT proname FROM pg_proc WHERE proname = ANY($1::text[])`, [FONCTIONS_ATTENDUES]
    );
    const presentes = new Set(fonctions.map((f) => f.proname));
    for (const f of FONCTIONS_ATTENDUES)
      if (!presentes.has(f)) alertes.push(`fonction SQL manquante : ${f}() — repli dégradé sur requêtes directes`);

    const { rows: tables } = await client.query(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`, [TABLES_RLS_ATTENDUES]
    );
    const parTable = new Map(tables.map((t) => [t.relname, t]));
    for (const t of TABLES_RLS_ATTENDUES) {
      const info = parTable.get(t);
      if (!info) alertes.push(`table absente : ${t}`);
      else if (!info.relrowsecurity || !info.relforcerowsecurity)
        alertes.push(`RLS non forcée sur "${t}" — isolation entre études NON garantie par la base`);
    }

    const { rows: role } = await client.query(`SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user`);
    if (role[0]?.rolbypassrls)
      console.warn(`⚠️  [self-check] Le rôle applicatif "${role[0].current_user}" a BYPASSRLS : ` +
        `la RLS est inopérante pour ce rôle (DATABASE_URL doit pointer sur notaria_app, jamais sur le rôle propriétaire).`);
  } catch (err) {
    alertes.push(`self-check impossible : ${err.message}`);
  } finally {
    await client.end().catch(() => {});
  }

  if (alertes.length) {
    console.warn("⚠️  [self-check RLS/sécurité] Anomalies détectées au démarrage :");
    for (const a of alertes) console.warn(`   - ${a}`);
  } else {
    console.log("✅ [self-check RLS/sécurité] RLS forcée et fonctions SECURITY DEFINER toutes présentes.");
  }
}
