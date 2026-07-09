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

  console.log("→ seed-demo (dossiers de démonstration)");
  await seedDemo((sql, params) => client.query(sql, params), true);
  console.log("→ seed-saas-complete (5 études de recette)");
  await seedSaasComplete((sql, params) => client.query(sql, params), true);

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
  console.log("→ seed-demo (dossiers de démonstration)");
  await seedDemo((sql, params) => client.query(sql, params), true);
  console.log("→ seed-saas-complete (5 études de recette)");
  await seedSaasComplete((sql, params) => client.query(sql, params), true);
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
     WHERE identifiant IN ('notaire','secretariat','clerc1','accueil')`
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
  console.log("→ seed-demo (dossiers de démonstration)");
  await seedDemo(queryFn, false);
  console.log("→ seed-saas-complete (5 études de recette)");
  await seedSaasComplete(queryFn, false);

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
