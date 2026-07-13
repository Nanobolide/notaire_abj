import fs from "fs";
import path from "path";
import { DEMO_ACTES, DEMO_APPELS } from "./demo-data.js";

const ETUDE_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_HASH = "$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm";

function prepareSchemaSql(sql) {
  const lines = sql.split("\n").filter((line) => {
    const t = line.trim();
    if (/^(GRANT|REVOKE)\s/i.test(t)) return false;
    if (/EXECUTE format\('GRANT/i.test(t)) return false;
    return true;
  });
  return lines
    .join("\n")
    .replace(/DO \$\$ BEGIN\s*CREATE ROLE notaria_app[\s\S]*?END \$\$;\s*/i, "")
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/i, "")
    .replace(/uuid_generate_v4\(\)/g, "gen_random_uuid()");
}

async function runSqlFile(db, relativePath, { transform } = {}) {
  let sql = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  if (transform) sql = transform(sql);
  await db.exec(sql);
}

async function tableExists(db, name) {
  const r = await db.query(`SELECT to_regclass($1) AS t`, [`public.${name}`]);
  return !!r.rows[0]?.t;
}

async function ensureSuperAdmin(db) {
  await db.query(
    `INSERT INTO utilisateurs (etude_id, role, identifiant, nom_affiche, fonction, email_rattachement,
       hash_mot_de_passe, doit_changer_mdp, niveau_acces)
     VALUES ($1,'super_admin','superadmin','Super Administrateur','Direction Produit','support@notaria.ci',
       $2,true,'administrateur')
     ON CONFLICT (identifiant) DO NOTHING`,
    [ETUDE_ID, DEMO_HASH]
  );
}

async function uidFor(db, nom) {
  const m = { Secrétariat: "secretariat", Accueil: "accueil", "Clerc 1": "clerc1", "Le Notaire": "notaire" };
  if (!m[nom]) return null;
  const r = await db.query(`SELECT id FROM utilisateurs WHERE identifiant = $1`, [m[nom]]);
  return r.rows[0]?.id || null;
}

async function seedDemoData(db) {
  const check = await db.query(
    `SELECT 1 FROM actes WHERE etude_id = $1 AND numero_minute = '2026/0201' LIMIT 1`,
    [ETUDE_ID]
  );
  if (check.rows.length) {
    console.log("→ Données démo déjà présentes.");
    return;
  }

  console.log("→ Chargement démo (30 actes, 30 appels)…");
  for (const a of DEMO_ACTES) {
    const ins = await db.query(
      `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
         nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
         valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par,
         emoluments, exonere_tva, droits_etat, debours, depenses_formalites,
         autres_depenses, statut_formalites)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $11 THEN now() ELSE NULL END,
               $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING id`,
      [ETUDE_ID, a.numero_minute, a.numero_dossier, a.date_ouverture, a.date_echeance,
        a.nature_acte, a.complexite, a.responsable, a.conservation_fonciere, a.progression, a.fini,
        a.valeur_acte, a.honoraires_totaux, a.montant_regle, a.statut_paiement,
        a.difficultes, a.observations, await uidFor(db, a.saisi),
        a.emoluments ?? 0, false, a.droits_etat ?? 0, a.debours ?? 0,
        a.depenses_formalites ?? 0, a.autres_depenses ?? 0, a.statut_formalites ?? "Pas encore débuté"]
    );
    const acteId = ins.rows[0].id;
    for (let i = 0; i < a.parties.length; i++) {
      await db.query(
        `INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`,
        [ETUDE_ID, acteId, i + 1, a.parties[i]]
      );
    }
    if (a.piece) {
      await db.query(
        `INSERT INTO pieces_log (etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4)`,
        [ETUDE_ID, acteId, "Pièce manquante : " + a.piece, await uidFor(db, a.saisi)]
      );
    }
  }

  for (const p of DEMO_APPELS) {
    await db.query(
      `INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
         reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
         nb_tentatives, resolu_le, observations, saisi_par)
       VALUES ($1,$2,2026,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
               CASE WHEN $14 THEN ($4::date + interval '1 day' + time '17:00') ELSE NULL END, $15, $16)`,
      [ETUDE_ID, p.numero, p.type_flux, p.date_entree, p.heure, p.reference_dossier,
        p.client_nom, p.telephone, p.email, p.destinataire, p.motif, p.statut_traitement,
        p.nb_tentatives, p.resolu, p.observations, await uidFor(db, p.saisi)]
    );
  }
  console.log(`→ Démo chargée : ${DEMO_ACTES.length} actes, ${DEMO_APPELS.length} appels.`);
}

/** Initialise schéma + comptes + démo (idempotent). */
export async function initializeDatabase(db) {
  if (!(await tableExists(db, "utilisateurs"))) {
    console.log("→ PGlite : création du schéma (db/schema.sql)…");
    await runSqlFile(db, "db/schema.sql", { transform: prepareSchemaSql });
    console.log("→ PGlite : seed de base (db/seed.sql)…");
    await runSqlFile(db, "db/seed.sql");
    await ensureSuperAdmin(db);
    await seedDemoData(db);
    console.log("✅ Base PGlite prête.");
    return;
  }

  const users = await db.query(`SELECT count(*)::int AS n FROM utilisateurs`);
  if (Number(users.rows[0].n) === 0) {
    console.log("→ PGlite : seed de base…");
    await runSqlFile(db, "db/seed.sql");
    await ensureSuperAdmin(db);
  } else {
    await ensureSuperAdmin(db);
  }
  await seedDemoData(db);
}
