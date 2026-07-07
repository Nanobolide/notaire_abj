/**
 * Charge les données de démonstration (30 actes + 30 appels) si les registres sont vides.
 * Marqueur : minute 2026/0201 — idempotent, ne réécrit pas des données existantes.
 */
const { randomUUID } = require("crypto");
const path = require("path");
const { pathToFileURL } = require("url");

const ETUDE_ID = "11111111-1111-1111-1111-111111111111";
const MARQUEUR = "2026/0201";

const UID_MAP = {
  "Secrétariat": "secretariat",
  "Accueil": "accueil",
  "Clerc 1": "clerc1",
  "Le Notaire": "notaire",
  "Comptabilité": "secretariat",
  "Clerc 2": "clerc1",
  "Clerc 3": "clerc1",
};

function nowSql(isPg) {
  return isPg ? "now()" : "datetime('now')";
}

async function loadDemoData() {
  const mod = await import(pathToFileURL(path.join(__dirname, "../src/lib/demo-data.js")).href);
  return { DEMO_ACTES: mod.DEMO_ACTES, DEMO_APPELS: mod.DEMO_APPELS };
}

async function seedDemo(queryFn, isPg) {
  const marqueur = await queryFn(
    `SELECT 1 AS ok FROM actes WHERE etude_id = $1 AND numero_minute = $2 LIMIT 1`,
    [ETUDE_ID, MARQUEUR]
  );
  if (marqueur.rows[0]) {
    console.log("→ Données démo déjà présentes (ignoré).");
    return { skipped: true };
  }

  // Pas encore de jeu démo : on vide les registres pilotes puis on charge les 30+30 dossiers.
  await queryFn(`DELETE FROM pieces_log WHERE etude_id = $1`, [ETUDE_ID]);
  await queryFn(`DELETE FROM acte_parties WHERE etude_id = $1`, [ETUDE_ID]);
  await queryFn(`DELETE FROM actes WHERE etude_id = $1`, [ETUDE_ID]);
  await queryFn(`DELETE FROM appels_courriers WHERE etude_id = $1`, [ETUDE_ID]);

  const { DEMO_ACTES, DEMO_APPELS } = await loadDemoData();
  const now = nowSql(isPg);

  const uid = async (nom) => {
    const id = UID_MAP[nom];
    if (!id) return null;
    const r = await queryFn(`SELECT id FROM utilisateurs WHERE identifiant = $1`, [id]);
    return r.rows[0]?.id || null;
  };

  for (const a of DEMO_ACTES) {
    const termineSql = isPg
      ? `CASE WHEN $11 THEN ${now} ELSE NULL END`
      : `CASE WHEN $12 THEN ${now} ELSE NULL END`;
    const params = isPg
      ? [ETUDE_ID, a.numero_minute, a.numero_dossier, a.date_ouverture, a.date_echeance,
         a.nature_acte, a.complexite, a.responsable, a.conservation_fonciere, a.progression, a.fini ? 1 : 0,
         a.valeur_acte, a.honoraires_totaux, a.montant_regle, a.statut_paiement,
         a.difficultes, a.observations, await uid(a.saisi)]
      : [randomUUID(), ETUDE_ID, a.numero_minute, a.numero_dossier, a.date_ouverture, a.date_echeance,
         a.nature_acte, a.complexite, a.responsable, a.conservation_fonciere, a.progression, a.fini ? 1 : 0,
         a.valeur_acte, a.honoraires_totaux, a.montant_regle, a.statut_paiement,
         a.difficultes, a.observations, await uid(a.saisi)];
    const insertSql = isPg
      ? `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
         nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
         valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ${termineSql},
               $12,$13,$14,$15,$16,$17,$18) RETURNING id`
      : `INSERT INTO actes (id, etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
         nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
         valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, ${termineSql},
               $13,$14,$15,$16,$17,$18,$19) RETURNING id`;
    const ins = await queryFn(insertSql, params);
    const acteId = ins.rows[0].id;
    for (let i = 0; i < a.parties.length; i++) {
      const p = isPg
        ? [ETUDE_ID, acteId, i + 1, a.parties[i]]
        : [randomUUID(), ETUDE_ID, acteId, i + 1, a.parties[i]];
      await queryFn(
        isPg
          ? `INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`
          : `INSERT INTO acte_parties (id, etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4,$5)`,
        p
      );
    }
    if (a.piece) {
      const pl = isPg
        ? [ETUDE_ID, acteId, "Pièce manquante : " + a.piece, await uid(a.saisi)]
        : [randomUUID(), ETUDE_ID, acteId, "Pièce manquante : " + a.piece, await uid(a.saisi)];
      await queryFn(
        isPg
          ? `INSERT INTO pieces_log (etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4)`
          : `INSERT INTO pieces_log (id, etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4,$5)`,
        pl
      );
    }
  }

  for (const p of DEMO_APPELS) {
    const resoluSql = isPg
      ? `CASE WHEN $14 THEN ($4::date + interval '1 day' + time '17:00') ELSE NULL END`
      : `CASE WHEN $16 THEN datetime($6, '+1 day', '17:00') ELSE NULL END`;
    const apParams = isPg
      ? [ETUDE_ID, p.numero, p.type_flux, p.date_entree, p.heure, p.reference_dossier,
         p.client_nom, p.telephone, p.email, p.destinataire, p.motif, p.statut_traitement,
         p.nb_tentatives, p.resolu, p.observations, await uid(p.saisi)]
      : [randomUUID(), ETUDE_ID, p.numero, 2026, p.type_flux, p.date_entree, p.heure, p.reference_dossier,
         p.client_nom, p.telephone, p.email, p.destinataire, p.motif, p.statut_traitement,
         p.nb_tentatives, p.resolu ? 1 : 0, p.observations, await uid(p.saisi)];
    const apSql = isPg
      ? `INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
         reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
         nb_tentatives, resolu_le, observations, saisi_par)
       VALUES ($1,$2,2026,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, ${resoluSql}, $15, $16)`
      : `INSERT INTO appels_courriers (id, etude_id, numero, annee, type_flux, date_entree, heure,
         reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
         nb_tentatives, resolu_le, observations, saisi_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, ${resoluSql}, $17, $18)`;
    await queryFn(apSql, apParams);
  }

  if (isPg) {
    await queryFn(
      `INSERT INTO parametres_etude (etude_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [ETUDE_ID]
    );
  } else {
    await queryFn(`INSERT OR IGNORE INTO parametres_etude (etude_id) VALUES ($1)`, [ETUDE_ID]);
  }

  console.log(`→ Données démo chargées : ${DEMO_ACTES.length} actes, ${DEMO_APPELS.length} appels.`);
  return { actes: DEMO_ACTES.length, appels: DEMO_APPELS.length };
}

module.exports = { seedDemo, ETUDE_ID };
