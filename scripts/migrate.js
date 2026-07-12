/**
 * Migration — PostgreSQL si DATABASE_URL (Render), sinon SQLite local.
 * Idempotent : CREATE IF NOT EXISTS / ON CONFLICT DO NOTHING.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pgSslOptions = require("./pg-ssl");
const { seedDemo } = require("./seed-demo");
const { seedSaasComplete } = require("./seed-saas-complete");

const ROOT = path.join(__dirname, "..");

const ACTES_COLS_PG = [
  ["emoluments", "BIGINT NOT NULL DEFAULT 0"],
  ["exonere_tva", "BOOLEAN NOT NULL DEFAULT false"],
  ["droits_etat", "BIGINT NOT NULL DEFAULT 0"],
  ["debours", "BIGINT NOT NULL DEFAULT 0"],
  ["debours_rembourses", "BOOLEAN NOT NULL DEFAULT false"],
  ["prestations_annexes", "BIGINT NOT NULL DEFAULT 0"],
  ["autres_depenses", "BIGINT NOT NULL DEFAULT 0"],
  ["autres_depenses_motif", "VARCHAR"],
  ["depenses_formalites", "BIGINT NOT NULL DEFAULT 0"],
  ["statut_formalites", "VARCHAR NOT NULL DEFAULT 'Pas encore débuté'"],
];

async function ensureVisiteClient(queryFn, sqlite = false) {
  const { rows: etudes } = await queryFn(`SELECT id FROM etudes`);
  for (const { id: etudeId } of etudes) {
    const found = await queryFn(
      `SELECT 1 AS ok FROM referentiels WHERE etude_id = $1 AND type_liste = 'type_flux' AND valeur = 'Visite Client' LIMIT 1`,
      [etudeId]
    );
    if (found.rows[0]) continue;
    if (sqlite) {
      await queryFn(
        `INSERT INTO referentiels (id, etude_id, type_liste, valeur, ordre) VALUES ($1,$2,'type_flux','Visite Client',4)`,
        [crypto.randomUUID(), etudeId]
      );
    } else {
      await queryFn(
        `INSERT INTO referentiels (etude_id, type_liste, valeur, ordre) VALUES ($1,'type_flux','Visite Client',4)`,
        [etudeId]
      );
    }
  }
}

const PROGRESSION_V35 = [
  "Recensement des informations", "Paiement", "Formalité antérieure",
  "Rédaction", "Signature", "Préparation des formalités",
  "Dépôt des formalités", "Retrait de la minute", "Réception de l'état foncier",
  "Réception du CMPF", "Transmission client", "Terminé", "Annulé",
];
const NATURE_ACTE_V35 = [
  "Société", "Bail", "Vente", "Achat", "Donation", "Succession",
  "Ouverture de Crédit", "Mainlevée d'Hypothèque", "Procuration", "Contrat de Mariage",
  "Légalisation", "Adoption", "Reconnaissance d'Enfant Naturel", "Dation en Paiement", "Autres",
];

async function ensureReferentielsV35(queryFn, sqlite = false) {
  const { rows: etudes } = await queryFn(`SELECT id FROM etudes`);
  for (const { id: etudeId } of etudes) {
    for (const listes of [
      ["progression", PROGRESSION_V35],
      ["nature_acte", NATURE_ACTE_V35],
    ]) {
      const [type_liste, valeurs] = listes;
      for (let i = 0; i < valeurs.length; i++) {
        const valeur = valeurs[i];
        const ordre = i + 1;
        const found = await queryFn(
          `SELECT 1 AS ok FROM referentiels WHERE etude_id = $1 AND type_liste = $2 AND valeur = $3 LIMIT 1`,
          [etudeId, type_liste, valeur]
        );
        if (found.rows[0]) continue;
        if (sqlite) {
          await queryFn(
            `INSERT INTO referentiels (id, etude_id, type_liste, valeur, ordre) VALUES ($1,$2,$3,$4,$5)`,
            [crypto.randomUUID(), etudeId, type_liste, valeur, ordre]
          );
        } else {
          await queryFn(
            `INSERT INTO referentiels (etude_id, type_liste, valeur, ordre) VALUES ($1,$2,$3,$4)`,
            [etudeId, type_liste, valeur, ordre]
          );
        }
      }
    }
  }
}

async function resetDemoPasswords(queryFn) {
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("ChangezMoi2026!", 10);
  await queryFn(
    `UPDATE utilisateurs SET hash_mot_de_passe = $1, echecs_connexion = 0, verrouille_jusqua = NULL
     WHERE role = 'super_admin'
        OR identifiant IN ('notaire','secretariat','clerc1','accueil')
        OR identifiant LIKE '%.notaire' OR identifiant LIKE '%.secretariat'
        OR identifiant LIKE '%.clerc1' OR identifiant LIKE '%.comptable'`,
    [hash]
  );
}

async function migrateV27Pg(client) {
  for (const [col, def] of ACTES_COLS_PG)
    await client.query(`ALTER TABLE actes ADD COLUMN IF NOT EXISTS ${col} ${def}`);
  await client.query(`ALTER TABLE parametres_etude ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5,4) NOT NULL DEFAULT 0.18`);
  await client.query(`CREATE TABLE IF NOT EXISTS avis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonction VARCHAR,
    categorie VARCHAR NOT NULL DEFAULT 'Amélioration',
    message TEXT NOT NULL,
    recu_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE OR REPLACE FUNCTION compte_etat(p_uid UUID)
    RETURNS TABLE (ok BOOLEAN, niveau_acces VARCHAR, fonction VARCHAR)
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT (u.actif AND (u.role = 'super_admin' OR e.statut = 'active')
              AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= now())) AS ok,
             u.niveau_acces, u.fonction
      FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
      WHERE u.id = p_uid;
    $$`);
}

function migrateV27Sqlite(db) {
  const cols = [
    ["emoluments", "INTEGER NOT NULL DEFAULT 0"],
    ["exonere_tva", "INTEGER NOT NULL DEFAULT 0"],
    ["droits_etat", "INTEGER NOT NULL DEFAULT 0"],
    ["debours", "INTEGER NOT NULL DEFAULT 0"],
    ["debours_rembourses", "INTEGER NOT NULL DEFAULT 0"],
    ["prestations_annexes", "INTEGER NOT NULL DEFAULT 0"],
    ["autres_depenses", "INTEGER NOT NULL DEFAULT 0"],
    ["autres_depenses_motif", "TEXT"],
    ["depenses_formalites", "INTEGER NOT NULL DEFAULT 0"],
    ["statut_formalites", "TEXT NOT NULL DEFAULT 'Pas encore débuté'"],
  ];
  for (const [col, def] of cols) {
    try { db.exec(`ALTER TABLE actes ADD COLUMN ${col} ${def}`); } catch {}
  }
  try { db.exec(`ALTER TABLE parametres_etude ADD COLUMN taux_tva REAL NOT NULL DEFAULT 0.18`); } catch {}
  db.exec(`CREATE TABLE IF NOT EXISTS avis (
    id TEXT PRIMARY KEY,
    fonction TEXT,
    categorie TEXT NOT NULL DEFAULT 'Amélioration',
    message TEXT NOT NULL,
    recu_le TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

const REGLAGES_DEFAUT = [
  ["offres_actives", "false"],
  ["forfaits_restrictions_actives", "false"],
  ["annonces_visibles_par", "tous"],
];

async function migrateV35Pg(client) {
  await client.query(`ALTER TABLE etudes ADD COLUMN IF NOT EXISTS forfait VARCHAR(20) NOT NULL DEFAULT 'essentiel'`);
  await client.query(`CREATE TABLE IF NOT EXISTS reglages_plateforme (
    cle VARCHAR(60) PRIMARY KEY,
    valeur TEXT NOT NULL,
    maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  for (const [cle, valeur] of REGLAGES_DEFAUT) {
    await client.query(`INSERT INTO reglages_plateforme (cle, valeur) VALUES ($1,$2) ON CONFLICT (cle) DO NOTHING`, [cle, valeur]);
  }
  await client.query(`CREATE TABLE IF NOT EXISTS annonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(24) NOT NULL DEFAULT 'information',
    bien_ville VARCHAR(120),
    bien_prix BIGINT,
    contact_etude VARCHAR(160),
    cible VARCHAR(20) NOT NULL DEFAULT 'toutes',
    forfait_cible VARCHAR(20),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par UUID
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS annonce_etudes (
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
    PRIMARY KEY (annonce_id, etude_id)
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS annonce_lectures (
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
    lu_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (annonce_id, etude_id)
  )`);
  await client.query(`
    DO $$ DECLARE c name;
    BEGIN
      SELECT conname INTO c FROM pg_constraint
      WHERE conrelid = 'utilisateurs'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%niveau_acces%';
      IF c IS NOT NULL THEN EXECUTE 'ALTER TABLE utilisateurs DROP CONSTRAINT ' || quote_ident(c);
      END IF;
    END $$`);
  await client.query(`ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_niveau_acces_check
    CHECK (niveau_acces IN ('administrateur','notaire_salarie','comptable','standard','renseignement'))`);
}

function migrateV35Sqlite(db) {
  try { db.exec(`ALTER TABLE etudes ADD COLUMN forfait TEXT NOT NULL DEFAULT 'essentiel'`); } catch {}
  db.exec(`CREATE TABLE IF NOT EXISTS reglages_plateforme (
    cle TEXT PRIMARY KEY, valeur TEXT NOT NULL, maj_le TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  for (const [cle, valeur] of REGLAGES_DEFAUT) {
    db.prepare(`INSERT OR IGNORE INTO reglages_plateforme (cle, valeur) VALUES (?,?)`).run(cle, valeur);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS annonces (
    id TEXT PRIMARY KEY, titre TEXT NOT NULL, message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'information', bien_ville TEXT, bien_prix INTEGER,
    contact_etude TEXT, cible TEXT NOT NULL DEFAULT 'toutes', forfait_cible TEXT,
    cree_le TEXT NOT NULL DEFAULT (datetime('now')), cree_par TEXT
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS annonce_etudes (
    annonce_id TEXT NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
    PRIMARY KEY (annonce_id, etude_id)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS annonce_lectures (
    annonce_id TEXT NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
    lu_le TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (annonce_id, etude_id)
  )`);
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='utilisateurs'`).get();
  if (row?.sql && !row.sql.includes("'renseignement'")) {
    db.exec("PRAGMA foreign_keys=OFF");
    db.exec(`CREATE TABLE utilisateurs_v35 (
      id TEXT PRIMARY KEY, etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('super_admin','admin_etude','collaborateur')),
      identifiant TEXT NOT NULL, nom_affiche TEXT NOT NULL, fonction TEXT, email_rattachement TEXT,
      hash_mot_de_passe TEXT NOT NULL, doit_changer_mdp INTEGER NOT NULL DEFAULT 1,
      actif INTEGER NOT NULL DEFAULT 1, echecs_connexion INTEGER NOT NULL DEFAULT 0,
      verrouille_jusqua TEXT, derniere_activite TEXT, nom_complet TEXT,
      niveau_acces TEXT NOT NULL DEFAULT 'standard'
        CHECK (niveau_acces IN ('administrateur','notaire_salarie','comptable','standard','renseignement')),
      mfa_active INTEGER NOT NULL DEFAULT 0, mfa_method TEXT NOT NULL DEFAULT 'totp',
      mfa_secret TEXT, mfa_backup_codes TEXT,
      cree_le TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (identifiant)
    )`);
    db.exec(`INSERT INTO utilisateurs_v35 SELECT * FROM utilisateurs`);
    db.exec(`DROP TABLE utilisateurs`);
    db.exec(`ALTER TABLE utilisateurs_v35 RENAME TO utilisateurs`);
    db.exec("PRAGMA foreign_keys=ON");
  }
}

async function connectWithRetry(client, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await client.connect();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      const wait = i * 2000;
      console.log(`→ Connexion PostgreSQL échouée (${i}/${attempts}) : ${err.message}`);
      console.log(`→ Nouvelle tentative dans ${wait / 1000}s…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function migratePg() {
  const bcrypt = require("bcryptjs");
  const { Client } = require("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant pour la migration PostgreSQL.");

  const client = new Client({ connectionString: url, ssl: pgSslOptions(url) });
  await connectWithRetry(client);
  console.log("→ PostgreSQL (production Render)");

  for (const file of ["db/schema.pg.sql", "db/seed.pg.sql"]) {
    const sql = fs.readFileSync(path.join(ROOT, file), "utf8");
    console.log(`→ ${file}`);
    try {
      await client.query(sql);
    } catch (err) {
      console.error(`Erreur dans ${file} :`, err.message);
      throw err;
    }
  }

  await migrateV27Pg(client);
  console.log("→ migration v3.5");
  await migrateV35Pg(client);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_activite TIMESTAMPTZ`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS nom_complet VARCHAR`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS niveau_acces VARCHAR NOT NULL DEFAULT 'standard'`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_active BOOLEAN NOT NULL DEFAULT false`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(20) NOT NULL DEFAULT 'totp'`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_secret TEXT`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT`);
  await client.query(`CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etude_id UUID,
    utilisateur UUID,
    type_evenement VARCHAR(80) NOT NULL,
    severite VARCHAR(20) NOT NULL DEFAULT 'info',
    details JSONB,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) NOT NULL UNIQUE,
    nom VARCHAR(120) NOT NULL,
    prix_mensuel BIGINT NOT NULL DEFAULT 0,
    prix_annuel BIGINT NOT NULL DEFAULT 0,
    max_utilisateurs INT NOT NULL DEFAULT 10,
    max_stockage_go INT NOT NULL DEFAULT 10,
    actif BOOLEAN NOT NULL DEFAULT true,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS saas_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etude_id UUID UNIQUE REFERENCES etudes(id) ON DELETE CASCADE,
    nom_tenant VARCHAR(160) NOT NULL,
    contact_nom VARCHAR(160),
    contact_email VARCHAR(255),
    statut VARCHAR(20) NOT NULL DEFAULT 'actif',
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`UPDATE utilisateurs SET niveau_acces = 'administrateur' WHERE identifiant = 'notaire' AND niveau_acces = 'standard'`);

  // Mot de passe démo pour les comptes seed (test à distance Render)
  const hash = bcrypt.hashSync("ChangezMoi2026!", 10);
  await client.query(
    `UPDATE utilisateurs SET hash_mot_de_passe = $1
     WHERE identifiant IN ('notaire','secretariat','clerc1','accueil')`,
    [hash]
  );

  console.log("→ référentiel Visite Client");
  await ensureVisiteClient((sql, params) => client.query(sql, params), false);
  console.log("→ référentiels v3.5 (progression, nature)");
  await ensureReferentielsV35((sql, params) => client.query(sql, params), false);
  console.log("→ seed-demo (dossiers de démonstration)");
  await seedDemo((sql, params) => client.query(sql, params), true);
  console.log("→ seed-saas-complete (5 études de recette)");
  await seedSaasComplete((sql, params) => client.query(sql, params), true);
  console.log("→ mots de passe démo");
  await resetDemoPasswords((sql, params) => client.query(sql, params));

  await client.end();
  console.log("\n✅ Migration PostgreSQL terminée.");
}

async function migratePgWithConnectionString(url, label = "postgres") {
  const bcrypt = require("bcryptjs");
  const { Client } = require("pg");
  if (!url) throw new Error(`DATABASE_URL manquant pour la migration ${label}.`);
  const client = new Client({ connectionString: url, ssl: pgSslOptions(url) });
  await connectWithRetry(client);
  console.log(`→ PostgreSQL (${label})`);
  for (const file of ["db/schema.pg.sql", "db/seed.pg.sql"]) {
    const sql = fs.readFileSync(path.join(ROOT, file), "utf8");
    console.log(`→ ${file}`);
    await client.query(sql);
  }
  await migrateV27Pg(client);
  console.log("→ migration v3.5");
  await migrateV35Pg(client);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_activite TIMESTAMPTZ`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS nom_complet VARCHAR`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS niveau_acces VARCHAR NOT NULL DEFAULT 'standard'`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_active BOOLEAN NOT NULL DEFAULT false`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(20) NOT NULL DEFAULT 'totp'`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_secret TEXT`);
  await client.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT`);
  await client.query(`CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etude_id UUID,
    utilisateur UUID,
    type_evenement VARCHAR(80) NOT NULL,
    severite VARCHAR(20) NOT NULL DEFAULT 'info',
    details JSONB,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) NOT NULL UNIQUE,
    nom VARCHAR(120) NOT NULL,
    prix_mensuel BIGINT NOT NULL DEFAULT 0,
    prix_annuel BIGINT NOT NULL DEFAULT 0,
    max_utilisateurs INT NOT NULL DEFAULT 10,
    max_stockage_go INT NOT NULL DEFAULT 10,
    actif BOOLEAN NOT NULL DEFAULT true,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS saas_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etude_id UUID UNIQUE REFERENCES etudes(id) ON DELETE CASCADE,
    nom_tenant VARCHAR(160) NOT NULL,
    contact_nom VARCHAR(160),
    contact_email VARCHAR(255),
    statut VARCHAR(20) NOT NULL DEFAULT 'actif',
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`UPDATE utilisateurs SET niveau_acces = 'administrateur' WHERE identifiant = 'notaire' AND niveau_acces = 'standard'`);
  const hash = bcrypt.hashSync("ChangezMoi2026!", 10);
  await client.query(
    `UPDATE utilisateurs SET hash_mot_de_passe = $1
     WHERE identifiant IN ('notaire','secretariat','clerc1','accueil')`,
    [hash]
  );
  console.log("→ référentiel Visite Client");
  await ensureVisiteClient((sql, params) => client.query(sql, params), false);
  console.log("→ référentiels v3.5 (progression, nature)");
  await ensureReferentielsV35((sql, params) => client.query(sql, params), false);
  console.log("→ seed-demo (dossiers de démonstration)");
  await seedDemo((sql, params) => client.query(sql, params), true);
  console.log("→ seed-saas-complete (5 études de recette)");
  await seedSaasComplete((sql, params) => client.query(sql, params), true);
  console.log("→ mots de passe démo");
  await resetDemoPasswords((sql, params) => client.query(sql, params));
  await client.end();
}

async function migratePgTenants() {
  const raw = process.env.TENANT_DATABASE_URLS;
  if (!raw) return false;
  let map;
  try { map = JSON.parse(raw); } catch { throw new Error("TENANT_DATABASE_URLS doit être un JSON valide."); }
  if (!map || typeof map !== "object") return false;
  const entries = Object.entries(map).filter(([, url]) => !!url);
  if (!entries.length) return false;
  for (const [tenantId, url] of entries) {
    await migratePgWithConnectionString(url, `tenant:${tenantId}`);
    console.log(`✅ Migration tenant ${tenantId} terminée.`);
  }
  return true;
}

function migrateSqlite() {
  return migrateSqliteAsync();
}

async function migrateSqliteAsync() {
  const bcrypt = require("bcryptjs");
  const { DatabaseSync } = require("node:sqlite");
  const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, "data", "notaria.db");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  console.log("→ SQLite (développement local)");
  for (const file of ["db/schema.sqlite.sql", "db/seed.sqlite.sql"]) {
    console.log(`→ ${file}`);
    db.exec(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }
  migrateV27Sqlite(db);
  console.log("→ migration v3.5");
  migrateV35Sqlite(db);
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN derniere_activite TEXT"); } catch {}
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN nom_complet TEXT"); } catch {}
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN niveau_acces TEXT NOT NULL DEFAULT 'standard'"); } catch {}
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN mfa_active INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN mfa_method TEXT NOT NULL DEFAULT 'totp'"); } catch {}
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN mfa_secret TEXT"); } catch {}
  try { db.exec("ALTER TABLE utilisateurs ADD COLUMN mfa_backup_codes TEXT"); } catch {}
  db.exec(`CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    etude_id TEXT,
    utilisateur TEXT,
    type_evenement TEXT NOT NULL,
    severite TEXT NOT NULL DEFAULT 'info',
    details TEXT,
    cree_le TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS saas_plans (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    prix_mensuel INTEGER NOT NULL DEFAULT 0,
    prix_annuel INTEGER NOT NULL DEFAULT 0,
    max_utilisateurs INTEGER NOT NULL DEFAULT 10,
    max_stockage_go INTEGER NOT NULL DEFAULT 10,
    actif INTEGER NOT NULL DEFAULT 1,
    cree_le TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS saas_tenants (
    id TEXT PRIMARY KEY,
    etude_id TEXT UNIQUE REFERENCES etudes(id) ON DELETE CASCADE,
    nom_tenant TEXT NOT NULL,
    contact_nom TEXT,
    contact_email TEXT,
    statut TEXT NOT NULL DEFAULT 'actif',
    cree_le TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.prepare(`UPDATE utilisateurs SET niveau_acces = 'administrateur' WHERE identifiant = 'notaire' AND (niveau_acces IS NULL OR niveau_acces = 'standard')`).run();
  db.prepare(`UPDATE utilisateurs SET niveau_acces = 'standard' WHERE niveau_acces IS NULL`).run();
  const hash = bcrypt.hashSync("ChangezMoi2026!", 10);
  db.prepare(
    `UPDATE utilisateurs SET hash_mot_de_passe = ?
     WHERE identifiant IN ('notaire','secretariat','clerc1','accueil')
        OR role = 'super_admin'`
  ).run(hash);

  const queryFn = (sql, params = []) => {
    const bound = params.map((p) => (p === undefined ? null : p));
    const expanded = [];
    const s = sql.replace(/\$(\d+)/g, (_, n) => {
      expanded.push(bound[parseInt(n, 10) - 1]);
      return "?";
    });
    const head = sql.trim().split(/\s+/)[0].toUpperCase();
    if (head === "SELECT" || /RETURNING/i.test(sql)) {
      return { rows: db.prepare(s).all(...expanded) };
    }
    db.prepare(s).run(...expanded);
    return { rows: [] };
  };
  console.log("→ référentiel Visite Client");
  await ensureVisiteClient(queryFn, true);
  console.log("→ référentiels v3.5 (progression, nature)");
  await ensureReferentielsV35(queryFn, true);
  console.log("→ seed-demo (dossiers de démonstration)");
  await seedDemo(queryFn, false);
  console.log("→ seed-saas-complete (5 études de recette)");
  await seedSaasComplete(queryFn, false);
  console.log("→ mots de passe démo");
  await resetDemoPasswords(queryFn);

  if (!fs.existsSync(path.join(ROOT, ".env"))
    && !process.env.JWT_SECRET && !process.env.RENDER && process.env.NODE_ENV !== "production") {
    const jwt = crypto.randomBytes(32).toString("hex");
    const relPath = path.relative(ROOT, DB_PATH).replace(/\\/g, "/");
    fs.writeFileSync(path.join(ROOT, ".env"), `DATABASE_PATH=${relPath}\nJWT_SECRET=${jwt}\n`, "utf8");
    console.log("→ .env créé");
  }
  console.log(`\n✅ Migration SQLite terminée (${DB_PATH}).`);
}

(async () => {
  try {
    if (process.env.DATABASE_URL) {
      const done = await migratePgTenants();
      if (!done) await migratePg();
    }
    else await migrateSqliteAsync();
  } catch (err) {
    console.error("Erreur migration :", err.message);
    process.exit(1);
  }
})();
