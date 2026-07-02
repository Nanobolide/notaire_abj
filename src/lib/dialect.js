/** Helpers SQL selon le moteur : PostgreSQL (DATABASE_URL) ou SQLite (local). */

export function isPg() {
  return !!process.env.DATABASE_URL;
}

export function now() {
  return isPg() ? "now()" : "datetime('now')";
}

export function actifClause(alias = "u") {
  return isPg() ? `${alias}.actif = true` : `${alias}.actif = 1`;
}

export function lockAccountSql() {
  return isPg()
    ? "verrouille_jusqua = now() + interval '100 years'"
    : "verrouille_jusqua = datetime('now', '+100 years')";
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
             COALESCE($5::date, CURRENT_DATE + 14),
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
             COALESCE($6, date('now', '+14 days')),
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

export function sqlDashboard() {
  if (isPg()) {
    return {
      appels: `SELECT count(*) FILTER (WHERE date_entree = CURRENT_DATE) AS aujourdhui,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu') AS en_cours,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu'
                 AND type_flux = 'Appel Téléphonique'
                 AND (date_entree + heure) < now() - interval '72 hours') AS alertes_72h,
               count(*) FILTER (WHERE nb_tentatives >= 3 AND statut_traitement <> 'Résolu') AS tentatives_3plus
        FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL`,
      actes: `SELECT count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé')) AS en_cours,
               count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé')
                 AND date_echeance < CURRENT_DATE) AS echeances_depassees,
               COALESCE(sum(montant_regle),0) AS encaisse,
               COALESCE(sum(honoraires_totaux - montant_regle),0) AS reste_a_payer,
               COALESCE(sum(valeur_acte),0) AS valeur_totale
        FROM actes WHERE etude_id = $1 AND supprime_le IS NULL`,
      parConservation: `SELECT conservation_fonciere,
               count(*) AS dossiers,
               round(avg(COALESCE(termine_le::date, CURRENT_DATE) - date_ouverture)) AS delai_moyen_jours,
               count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé')
                 AND date_echeance < CURRENT_DATE) AS en_depassement
        FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND conservation_fonciere IS NOT NULL
        GROUP BY conservation_fonciere ORDER BY delai_moyen_jours DESC NULLS LAST`,
      comparatif: `SELECT to_char(date_trunc('month', date_entree), 'YYYY-MM') AS mois,
               count(*) AS appels,
               count(*) FILTER (WHERE resolu_le IS NOT NULL
                 AND resolu_le - (date_entree + heure) <= interval '72 hours') AS resolus_sous_72h
        FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL
        GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,
    };
  }
  return {
    appels: `SELECT sum(case when date_entree = date('now') then 1 else 0 end) AS aujourdhui,
             sum(case when statut_traitement <> 'Résolu' then 1 else 0 end) AS en_cours,
             sum(case when statut_traitement <> 'Résolu'
               AND type_flux = 'Appel Téléphonique'
               AND datetime(date_entree || ' ' || coalesce(heure,'00:00')) < datetime('now', '-72 hours')
               then 1 else 0 end) AS alertes_72h,
             sum(case when nb_tentatives >= 3 AND statut_traitement <> 'Résolu' then 1 else 0 end) AS tentatives_3plus
      FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL`,
    actes: `SELECT sum(case when progression NOT IN ('Terminé','Annulé') then 1 else 0 end) AS en_cours,
             sum(case when progression NOT IN ('Terminé','Annulé')
               AND date_echeance < date('now') then 1 else 0 end) AS echeances_depassees,
             COALESCE(sum(montant_regle),0) AS encaisse,
             COALESCE(sum(honoraires_totaux - montant_regle),0) AS reste_a_payer,
             COALESCE(sum(valeur_acte),0) AS valeur_totale
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL`,
    parConservation: `SELECT conservation_fonciere,
             count(*) AS dossiers,
             round(avg(julianday(COALESCE(date(termine_le), date('now'))) - julianday(date_ouverture))) AS delai_moyen_jours,
             sum(case when progression NOT IN ('Terminé','Annulé')
               AND date_echeance < date('now') then 1 else 0 end) AS en_depassement
      FROM actes WHERE etude_id = $1 AND supprime_le IS NULL AND conservation_fonciere IS NOT NULL
      GROUP BY conservation_fonciere ORDER BY delai_moyen_jours DESC`,
    comparatif: `SELECT strftime('%Y-%m', date_entree) AS mois,
             count(*) AS appels,
             sum(case when resolu_le IS NOT NULL
               AND (julianday(resolu_le) - julianday(datetime(date_entree || ' ' || coalesce(heure,'00:00')))) * 24 <= 72
               then 1 else 0 end) AS resolus_sous_72h
      FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL
      GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,
  };
}
