/** Helpers SQL — PostgreSQL (DATABASE_URL) ou SQLite (local sans DATABASE_URL). */

export function isPg() {
  return !!process.env.DATABASE_URL;
}

export function now() {
  return isPg() ? "now()" : "datetime('now')";
}

export function today() {
  return isPg() ? "CURRENT_DATE" : "date('now')";
}

/** Comptage conditionnel : FILTER (PG) / CASE (SQLite). */
export function cnt(cond) {
  return isPg()
    ? `count(*) FILTER (WHERE ${cond})`
    : `COALESCE(sum(case when ${cond} then 1 else 0 end), 0)`;
}

export const EN_COURS = `progression NOT IN ('Terminé','Annulé')`;

export function actifClause(alias = "u") {
  const col = alias ? `${alias}.actif` : "actif";
  return isPg() ? `${col} = true` : `${col} = 1`;
}

export function actifFalse() {
  return isPg() ? "false" : "0";
}

/** Fenêtre récente (anti-doublon) : now() - interval en PG, datetime() en SQLite. */
export function depuisMinutes(minutes) {
  return isPg()
    ? `now() - interval '${minutes} minutes'`
    : `datetime('now', '-${minutes} minutes')`;
}

export function lockAccountSql() {
  return isPg()
    ? "verrouille_jusqua = now() + interval '100 years'"
    : "verrouille_jusqua = datetime('now', '+100 years')";
}

/** Jours écoulés depuis une date (pour seuils d'urgence). */
export function joursDepuis(col) {
  return isPg()
    ? `${today()} - ${col}`
    : `cast(julianday(${today()}) - julianday(${col}) as integer)`;
}

export function sqlAppelsNumero() {
  return isPg()
    ? `SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM appels_courriers
       WHERE etude_id = $1 AND annee = EXTRACT(YEAR FROM now())`
    : `SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM appels_courriers
       WHERE etude_id = $1 AND annee = cast(strftime('%Y','now') AS integer)`;
}

export function sqlAppelsInsert() {
  if (isPg()) {
    return `INSERT INTO appels_courriers
      (etude_id, numero, type_flux, date_entree, heure, reference_dossier, client_nom,
       telephone, email, destinataire, mis_en_relation, motif, statut_traitement,
       nb_tentatives, observations, saisi_par)
     VALUES ($1, prochain_numero_appel($1), $2,
             COALESCE($3::date, CURRENT_DATE), COALESCE($4::time, LOCALTIME),
             $5,$6,$7,$8,$9,$10,$11,COALESCE($12,'Non commencé'),COALESCE($13,0),$14,$15)
     RETURNING *`;
  }
  return `INSERT INTO appels_courriers
    (id, etude_id, numero, type_flux, date_entree, heure, reference_dossier, client_nom,
     telephone, email, destinataire, mis_en_relation, motif, statut_traitement,
     nb_tentatives, observations, saisi_par)
   VALUES ($1,$2,$3,$4,
           COALESCE($5, date('now')), COALESCE($6, time('now')),
           $7,$8,$9,$10,$11,$12,$13,COALESCE($14,'Non commencé'),COALESCE($15,0),$16,$17)
   RETURNING *`;
}

export function sqlPartiesSubquery(alias = "a") {
  return isPg()
    ? `COALESCE((SELECT string_agg(p.nom_partie, ' / ' ORDER BY p.ordre)
                FROM acte_parties p WHERE p.acte_id = ${alias}.id AND p.etude_id = ${alias}.etude_id), '')`
    : `COALESCE((SELECT group_concat(nom_partie, ' / ')
                FROM (SELECT nom_partie FROM acte_parties
                      WHERE acte_id = ${alias}.id AND etude_id = ${alias}.etude_id
                      ORDER BY ordre)), '')`;
}

export function sqlActesList() {
  if (isPg()) {
    return `SELECT a.*,
            COALESCE((SELECT string_agg(p.nom_partie, ' / ' ORDER BY p.ordre)
                      FROM acte_parties p WHERE p.acte_id = a.id AND p.etude_id = a.etude_id), '') AS parties
     FROM actes a WHERE a.etude_id = $1 AND a.supprime_le IS NULL`;
  }
  return `SELECT a.*,
          COALESCE((SELECT group_concat(p.nom_partie, ' / ')
                    FROM (SELECT nom_partie FROM acte_parties p
                          WHERE p.acte_id = a.id AND p.etude_id = a.etude_id
                          ORDER BY p.ordre)), '') AS parties
   FROM actes a WHERE a.etude_id = $1 AND a.supprime_le IS NULL`;
}

export function sqlActesInsert() {
  if (isPg()) {
    return `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
       nature_acte, complexite, responsable, conservation_fonciere, progression,
       valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
     VALUES ($1,$2,$3,
             COALESCE($4::date, CURRENT_DATE),
             COALESCE($5::date, CURRENT_DATE + 30),
             $6,$7,$8,$9, COALESCE($10,'Rédaction'),
             COALESCE($11,0),COALESCE($12,0),COALESCE($13,0),
             COALESCE($14,'En attente'), $15, $16, $17)
     RETURNING *`;
  }
  return `INSERT INTO actes (id, etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
       nature_acte, complexite, responsable, conservation_fonciere, progression,
       valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
     VALUES ($1,$2,$3,$4,
             COALESCE($5, date('now')),
             COALESCE($6, date('now', '+30 days')),
             $7,$8,$9,$10, COALESCE($11,'Rédaction'),
             COALESCE($12,0),COALESCE($13,0),COALESCE($14,0),
             COALESCE($15,'En attente'), $16, $17, $18)
     RETURNING *`;
}

export function sqlPartiesInsert() {
  return isPg()
    ? `INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`
    : `INSERT INTO acte_parties (id, etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4,$5)`;
}

export function sqlPiecesInsert() {
  return isPg()
    ? `INSERT INTO pieces_log (etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4) RETURNING texte, horodatage`
    : `INSERT INTO pieces_log (id, etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4,$5) RETURNING texte, horodatage`;
}

export function sqlReferentiels() {
  return isPg()
    ? `SELECT type_liste, valeur FROM referentiels WHERE etude_id = $1 AND actif = true ORDER BY type_liste, ordre`
    : `SELECT type_liste, valeur FROM referentiels WHERE etude_id = $1 AND actif = 1 ORDER BY type_liste, ordre`;
}

/** Requêtes tableau de bord (version enrichie). */
export function dashboardQueries() {
  const t = today();
  const jOuv = joursDepuis("date_ouverture");
  const barème = `(CASE WHEN nature_acte = 'Succession' THEN 365 WHEN complexite = 'Simple' THEN 60 ELSE 90 END)`;
  const jEnt = joursDepuis("date_entree");

  if (isPg()) {
    return {
      actes: `SELECT count(*) AS total,
        ${cnt(EN_COURS)} AS en_cours,
        ${cnt("progression = 'Terminé'")} AS termines,
        ${cnt("progression = 'Annulé'")} AS annules,
        ${cnt(`${EN_COURS} AND date_echeance < ${t}`)} AS echeances_depassees,
        ${cnt(`${EN_COURS} AND ${jOuv} > ${barème}`)} AS critiques
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL`,
      finances: `SELECT COALESCE(sum(emoluments + droits_etat + debours + prestations_annexes + autres_depenses),0) AS total_facture,
        COALESCE(sum(emoluments),0) AS emoluments,
        COALESCE(sum(honoraires_totaux),0) AS frais_annonces,
        COALESCE(sum(montant_regle),0) AS honoraires_regles,
        COALESCE(sum(emoluments + droits_etat + debours + prestations_annexes + autres_depenses - montant_regle),0) AS reste_a_payer,
        COALESCE(sum(valeur_acte),0) AS valeur_totale,
        COALESCE(sum(emoluments + droits_etat + debours + prestations_annexes + autres_depenses) FILTER (WHERE ${EN_COURS}),0) AS zoom_honoraires_en_cours,
        COALESCE(sum(valeur_acte) FILTER (WHERE ${EN_COURS}),0) AS zoom_valeur_en_cours
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL`,
      parConservation: `SELECT conservation_fonciere, count(*) AS dossiers,
        ${cnt(EN_COURS)} AS en_cours,
        ${cnt("progression = 'Terminé'")} AS termines,
        ${cnt(`${EN_COURS} AND date_echeance < ${t}`)} AS depassees
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND conservation_fonciere IS NOT NULL
      GROUP BY conservation_fonciere ORDER BY conservation_fonciere`,
      parEtape: `SELECT progression AS etape, count(*) AS dossiers
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND ${EN_COURS}
      GROUP BY progression ORDER BY count(*) DESC`,
      parResponsable: `SELECT responsable, count(*) AS total,
        ${cnt("progression = 'Terminé'")} AS termines,
        ${cnt(EN_COURS)} AS en_cours,
        ${cnt(`${EN_COURS} AND date_echeance < ${t}`)} AS depassees
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND responsable IS NOT NULL
      GROUP BY responsable ORDER BY count(*) DESC`,
      appels: `SELECT count(*) AS total,
        ${cnt("statut_traitement = 'Résolu'")} AS resolus,
        ${cnt("statut_traitement = 'En cours'")} AS en_cours,
        ${cnt("statut_traitement = 'En attente du Clerc'")} AS en_attente,
        ${cnt("statut_traitement <> 'Résolu' AND nb_tentatives >= 3")} AS tentatives_3plus,
        ${cnt(`statut_traitement <> 'Résolu' AND ${jEnt} > 5`)} AS urgents
      FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL`,
      parFlux: `SELECT type_flux, count(*) AS nombre FROM appels_courriers
      WHERE etude_id = $1 AND supprime_le IS NULL GROUP BY type_flux ORDER BY count(*) DESC`,
      parMotif: `SELECT motif, count(*) AS nombre FROM appels_courriers
      WHERE etude_id = $1 AND supprime_le IS NULL AND motif IS NOT NULL GROUP BY motif ORDER BY count(*) DESC`,
      parCollaborateur: `SELECT destinataire, count(*) AS total,
        ${cnt("statut_traitement = 'Résolu'")} AS resolus,
        ${cnt("statut_traitement <> 'Résolu'")} AS non_resolus,
        ${cnt(`statut_traitement <> 'Résolu' AND ${jEnt} > 5`)} AS urgents
      FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL AND destinataire IS NOT NULL
      GROUP BY destinataire ORDER BY count(*) DESC`,
    };
  }

  const sumIf = (cond, col) => `COALESCE(sum(case when ${cond} then ${col} else 0 end),0)`;
  return {
    actes: `SELECT count(*) AS total,
      ${cnt(EN_COURS)} AS en_cours,
      ${cnt("progression = 'Terminé'")} AS termines,
      ${cnt("progression = 'Annulé'")} AS annules,
      ${cnt(`${EN_COURS} AND date_echeance < ${t}`)} AS echeances_depassees,
      ${cnt(`${EN_COURS} AND ${jOuv} > ${barème}`)} AS critiques
    FROM actes WHERE etude_id = $1 AND supprime_le IS NULL`,
    finances: `SELECT COALESCE(sum(emoluments + droits_etat + debours + prestations_annexes + autres_depenses),0) AS total_facture,
      COALESCE(sum(emoluments),0) AS emoluments,
      COALESCE(sum(honoraires_totaux),0) AS frais_annonces,
      COALESCE(sum(montant_regle),0) AS honoraires_regles,
      COALESCE(sum(emoluments + droits_etat + debours + prestations_annexes + autres_depenses - montant_regle),0) AS reste_a_payer,
      COALESCE(sum(valeur_acte),0) AS valeur_totale,
      ${sumIf(EN_COURS, "emoluments + droits_etat + debours + prestations_annexes + autres_depenses")} AS zoom_honoraires_en_cours,
      ${sumIf(EN_COURS, "valeur_acte")} AS zoom_valeur_en_cours
    FROM actes WHERE etude_id = $1 AND supprime_le IS NULL`,
    parConservation: `SELECT conservation_fonciere, count(*) AS dossiers,
      ${cnt(EN_COURS)} AS en_cours,
      ${cnt("progression = 'Terminé'")} AS termines,
      ${cnt(`${EN_COURS} AND date_echeance < ${t}`)} AS depassees
    FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND conservation_fonciere IS NOT NULL
    GROUP BY conservation_fonciere ORDER BY conservation_fonciere`,
    parEtape: `SELECT progression AS etape, count(*) AS dossiers
    FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND ${EN_COURS}
    GROUP BY progression ORDER BY count(*) DESC`,
    parResponsable: `SELECT responsable, count(*) AS total,
      ${cnt("progression = 'Terminé'")} AS termines,
      ${cnt(EN_COURS)} AS en_cours,
      ${cnt(`${EN_COURS} AND date_echeance < ${t}`)} AS depassees
    FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND responsable IS NOT NULL
    GROUP BY responsable ORDER BY count(*) DESC`,
    appels: `SELECT count(*) AS total,
      ${cnt("statut_traitement = 'Résolu'")} AS resolus,
      ${cnt("statut_traitement = 'En cours'")} AS en_cours,
      ${cnt("statut_traitement = 'En attente du Clerc'")} AS en_attente,
      ${cnt("statut_traitement <> 'Résolu' AND nb_tentatives >= 3")} AS tentatives_3plus,
      ${cnt(`statut_traitement <> 'Résolu' AND ${jEnt} > 5`)} AS urgents
    FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL`,
    parFlux: `SELECT type_flux, count(*) AS nombre FROM appels_courriers
    WHERE etude_id = $1 AND supprime_le IS NULL GROUP BY type_flux ORDER BY count(*) DESC`,
    parMotif: `SELECT motif, count(*) AS nombre FROM appels_courriers
    WHERE etude_id = $1 AND supprime_le IS NULL AND motif IS NOT NULL GROUP BY motif ORDER BY count(*) DESC`,
    parCollaborateur: `SELECT destinataire, count(*) AS total,
      ${cnt("statut_traitement = 'Résolu'")} AS resolus,
      ${cnt("statut_traitement <> 'Résolu'")} AS non_resolus,
      ${cnt(`statut_traitement <> 'Résolu' AND ${jEnt} > 5`)} AS urgents
    FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL AND destinataire IS NOT NULL
    GROUP BY destinataire ORDER BY count(*) DESC`,
  };
}
