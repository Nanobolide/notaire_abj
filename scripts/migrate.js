/**
 * Migration — PostgreSQL si DATABASE_URL (Render), sinon SQLite local.
 *
 * PostgreSQL : migrations VERSIONNÉES (db/migrations/NNNN_*.sql), chacune jouée
 * une seule fois et suivie dans la table schema_migrations. Avant ce mécanisme,
 * tout le schéma était rejoué à chaque déploiement (idempotent via IF NOT EXISTS /
 * ON CONFLICT DO NOTHING) — un fichier cassé (cf. historique : ON CONFLICT visant
 * une contrainte inexistante) n'était détecté qu'en le rejouant en entier sur une
 * base fraîche, jamais isolément. Désormais chaque fichier ne s'exécute qu'une
 * fois : une erreur dans un nouveau fichier n'affecte jamais les précédents, déjà
 * marqués appliqués.
 *
 * SQLite (dev local) reste sur l'ancien mécanisme de rejeu idempotent complet :
 * pas de vrai enjeu de dérive en dev, et le confort du "npm run dev" sans jamais
 * se soucier de l'état de la base prime.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pgSslOptions = require("./pg-ssl");
const { seedDemo } = require("./seed-demo");
const { seedSaasComplete } = require("./seed-saas-complete");

const ROOT = path.join(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "db", "migrations");

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

/** Rejoue les fichiers db/migrations/*.sql non encore appliqués, dans l'ordre, un par un. */
async function runVersionedMigrations(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await client.query(`SELECT filename FROM schema_migrations`);
  const appliquees = new Set(rows.map((r) => r.filename));

  const fichiers = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const fichier of fichiers) {
    if (appliquees.has(fichier)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, fichier), "utf8");
    console.log(`→ migration ${fichier}`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [fichier]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Erreur dans la migration ${fichier} :`, err.message);
      throw err;
    }
  }
}

async function migratePgCommon(client, bcrypt) {
  await runVersionedMigrations(client);

  console.log("→ référentiel Visite Client");
  await ensureVisiteClient((sql, params) => client.query(sql, params), false);

  // Les données de démonstration (dossiers fictifs, études de recette, mot de
  // passe connu ChangezMoi2026!) ne se chargent QUE sur demande explicite —
  // jamais par défaut, y compris quand NODE_ENV=production (cf. render.yaml
  // pour l'environnement de test à distance, qui active SEED_DEMO=1).
  if (process.env.SEED_DEMO === "1") {
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
  } else {
    console.log("→ SEED_DEMO non activé : données de démonstration non chargées.");
  }
}

async function migratePg() {
  const bcrypt = require("bcryptjs");
  const { Client } = require("pg");
  // Les migrations créent des rôles/policies RLS et doivent contourner la RLS
  // elles-mêmes (BYPASSRLS) : on utilise le rôle propriétaire (ADMIN_DATABASE_URL),
  // jamais le rôle applicatif restreint notaria_app (DATABASE_URL).
  const url = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant pour la migration PostgreSQL.");
  if (!process.env.ADMIN_DATABASE_URL)
    console.warn("⚠️  ADMIN_DATABASE_URL absent — migration jouée avec DATABASE_URL. " +
      "Si ce rôle est notaria_app (RLS forcée), la migration va échouer sur les policies/rôles.");

  const client = new Client({ connectionString: url, ssl: pgSslOptions(url) });
  await connectWithRetry(client);
  console.log("→ PostgreSQL (production Render)");

  await migratePgCommon(client, bcrypt);

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

  await migratePgCommon(client, bcrypt);

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
  console.log("→ référentiel Visite Client");
  await ensureVisiteClient(queryFn, true);
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
