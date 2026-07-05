-- =============================================================
-- NOTARIA — Données de DÉMONSTRATION (identiques au classeur Excel V3)
-- 30 actes + 30 appels fictifs, avril-juin 2026 — étude pilote.
-- Chargement :  psql "$DATABASE_URL" -f db/demo.sql
-- Effacement :  psql "$DATABASE_URL" -f db/demo_reset.sql
-- =============================================================

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0201', 'D-2026-055', '2026-04-02', '2026-04-16', 'Vente immobilière', 'Simple', 'Clerc 1', 'COCODY', 'Terminé',
  now(), 35000000, 650000, 650000, 'Réglé', NULL, 'Signé le 24/04', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0201' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Kouadio A.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0201' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'Mme Brou S.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0202', 'D-2026-056', '2026-04-06', '2026-04-20', 'Succession', 'Complexe', 'Le Notaire', 'BOUAKE', 'Terminé',
  now(), 80000000, 1500000, 1500000, 'Réglé', 'Recherche d''un héritier à l''étranger', 'Clôturé le 12/06', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0202' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Héritiers Konan Y.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0203', 'D-2026-057', '2026-04-09', '2026-04-23', 'Bail commercial', 'Simple', 'Clerc 2', 'PLATEAU', 'Terminé',
  now(), 12000000, 300000, 300000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0203' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SCI Palmier');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0203' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'SARL Cacao Plus');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0204', 'D-2026-058', '2026-04-13', '2026-04-27', 'Vente de terrain urbain', 'Simple', 'Clerc 1', 'SONGON', 'État Foncier',
  NULL, 18000000, 420000, 200000, 'Partiel', 'Litige de bornage avec le voisin', 'Dossier sensible — suivre de près', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0204' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Traoré I.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0204' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Bamba L.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0204' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Plan de bornage', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0205', 'D-2026-059', '2026-04-16', '2026-04-30', 'Donation', 'Simple', 'Clerc 3', 'BINGERVILLE', 'Terminé',
  now(), 25000000, 500000, 500000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0205' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Assi P. → ses enfants');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0206', 'D-2026-060', '2026-04-20', '2026-05-04', 'Constitution de société', 'Simple', 'Clerc 2', 'TREICHVILLE', 'Annulé',
  now(), 0, 350000, 100000, 'Partiel', 'Associés en désaccord', 'Annulé à la demande des parties le 15/05', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0206' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SARL Ivoire Négoce');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0207', 'D-2026-061', '2026-04-22', '2026-05-06', 'Vente immobilière', 'Simple', 'Clerc 1', 'MARCORY', 'Terminé',
  now(), 42000000, 780000, 780000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0207' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Mme Ouattara F.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0207' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Koné D.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0208', 'D-2026-062', '2026-04-24', '2026-05-08', 'Prêt hypothécaire', 'Complexe', 'Le Notaire', 'RIVIERA', 'Formalités en cours',
  NULL, 55000000, 950000, 400000, 'Partiel', 'Attente mainlevée de la banque', 'Relancer la banque chaque semaine', NULL);
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0208' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Banque Atlantique');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0208' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Gnamba T.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0208' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Quitus fiscal', NULL);

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0209', 'D-2026-063', '2026-04-27', '2026-05-11', 'Succession', 'Simple', 'Clerc 3', 'ABOBO', 'Terminé',
  now(), 15000000, 380000, 380000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0209' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Héritiers Mme Adjoua B.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0210', 'D-2026-064', '2026-04-29', '2026-05-13', 'Notoriété', 'Simple', 'Clerc 2', 'YOPOUGON 1', 'Terminé',
  now(), 0, 150000, 150000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0210' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Famille Ekra');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0211', 'D-2026-065', '2026-05-04', '2026-05-18', 'Vente immobilière', 'Complexe', 'Le Notaire', 'COCODY', 'Signature',
  NULL, 95000000, 1700000, 850000, 'Partiel', 'Acheteur en France — procuration en cours', 'Signature prévue mi-juillet', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0211' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SCI Horizon');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0211' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Diabaté M.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0211' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Procuration', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0212', 'D-2026-066', '2026-05-07', '2026-05-21', 'Succession', 'Complexe', 'Clerc 1', 'YAMOUSSOUKRO', 'Terminé',
  now(), 60000000, 1200000, 1200000, 'Réglé', NULL, 'Clôturé le 30/06', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0212' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Héritiers N''Dri K.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0213', 'D-2026-067', '2026-05-11', '2026-05-25', 'Vente de terrain urbain', 'Simple', 'Clerc 2', 'DABOU', 'État Foncier',
  NULL, 9000000, 280000, 280000, 'Réglé', 'Attestation villageoise difficile à obtenir', NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0213' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Séka J.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0213' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'Mme Amon C.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0213' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Attestation villageoise', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0214', 'D-2026-068', '2026-05-13', '2026-05-27', 'Bail commercial', 'Simple', 'Clerc 3', 'ADZOPE', 'Terminé',
  now(), 8000000, 250000, 250000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0214' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Fofana S.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0214' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'Pharmacie du Marché');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0215', 'D-2026-069', '2026-05-15', '2026-05-29', 'Donation', 'Simple', 'Clerc 1', 'GRAND-BASSAM', 'Terminé',
  now(), 20000000, 450000, 450000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0215' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Mme Tanoh E. → sa fille');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0216', 'D-2026-070', '2026-05-18', '2026-06-01', 'Vente immobilière', 'Simple', 'Clerc 2', 'PLATEAU', 'Rédaction',
  NULL, 30000000, 600000, 0, 'En attente', 'Titre foncier introuvable côté vendeur', '⚠ Dossier bloqué — voir le Notaire', NULL);
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0216' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Koffi R.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0216' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Zadi B.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0216' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Titre foncier', NULL);

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0217', 'D-2026-071', '2026-05-20', '2026-06-03', 'Constitution de société', 'Simple', 'Le Notaire', 'TREICHVILLE', 'Terminé',
  now(), 5000000, 400000, 400000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0217' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SAS Karité d''Or');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0218', 'D-2026-072', '2026-05-22', '2026-06-05', 'Succession', 'Complexe', 'Clerc 3', 'DIVO', 'Annulé',
  now(), 0, 800000, 0, 'En attente', 'Famille retirée du dossier', 'Annulé le 20/06', NULL);
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0218' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Héritiers Aka P.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0218' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Acte de naissance', NULL);

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0219', 'D-2026-073', '2026-05-26', '2026-06-09', 'Prêt hypothécaire', 'Simple', 'Clerc 1', 'MARCORY', 'Terminé',
  now(), 28000000, 520000, 520000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0219' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SGBCI');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0219' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'Mme Yao A.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0220', 'D-2026-074', '2026-05-28', '2026-06-11', 'Vente immobilière', 'Complexe', 'Le Notaire', 'RIVIERA', 'Préparation des formalités',
  NULL, 70000000, 1300000, 650000, 'Partiel', NULL, NULL, NULL);
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0220' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Coulibaly Z.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0220' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'SCI Baobab');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0220' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : CNI / Pièce d''identité', NULL);

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0221', 'D-2026-075', '2026-06-05', '2026-06-19', 'Vente de terrain urbain', 'Simple', 'Clerc 2', 'SONGON', 'Formalités en cours',
  NULL, 11000000, 320000, 320000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0221' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Guei F.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0221' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Ballo O.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0221' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Plan de bornage', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0222', 'D-2026-076', '2026-06-09', '2026-06-23', 'Succession', 'Simple', 'Clerc 1', 'ABENGOUROU', 'Rédaction',
  NULL, 22000000, 480000, 240000, 'Partiel', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0222' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Héritiers Kacou L.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0222' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Certificat de mariage', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0223', 'D-2026-077', '2026-06-12', '2026-06-26', 'Vente immobilière', 'Simple', 'Clerc 3', 'KORHOGO', 'Terminé',
  now(), 16000000, 350000, 350000, 'Réglé', NULL, 'Dossier éclair — 10 jours', NULL);
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0223' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Mme Ahoua V.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0223' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Djè K.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0224', 'D-2026-078', '2026-06-15', '2026-06-29', 'Bail commercial', 'Simple', 'Clerc 2', 'COCODY', 'Transmission du projet',
  NULL, 10000000, 300000, 150000, 'Partiel', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0224' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SCI Lagune');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0224' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'Restaurant Chez Tantie');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0225', 'D-2026-079', '2026-06-18', '2026-07-02', 'Vente immobilière', 'Complexe', 'Le Notaire', 'BOUAKE', 'Paiement des frais',
  NULL, 48000000, 900000, 0, 'En attente', 'Frais d''enregistrement en attente', 'Relancer l''acheteur', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0225' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Ipou G.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0225' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'Mme Sanogo W.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0225' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Quitus fiscal', (SELECT id FROM utilisateurs WHERE identifiant='clerc1' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0226', 'D-2026-080', '2026-06-22', '2026-07-06', 'Donation', 'Simple', 'Clerc 1', 'AGBOVILLE', 'Rédaction',
  NULL, 18000000, 400000, 400000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0226' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'M. Bictogo H. → son neveu');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0227', 'D-2026-081', '2026-06-24', '2026-07-08', 'Notoriété', 'Simple', 'Clerc 3', 'GAGNOA', 'Réception des actes',
  NULL, 0, 180000, 90000, 'Partiel', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0227' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Famille Gbagbo N.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0227' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Acte de naissance', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0228', 'D-2026-082', '2026-06-27', '2026-07-11', 'Vente immobilière', 'Simple', 'Clerc 2', 'BINGERVILLE', 'Rédaction',
  NULL, 26000000, 550000, 275000, 'Partiel', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0228' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Mme Kramo J.');
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0228' AND etude_id='11111111-1111-1111-1111-111111111111'), 2, 'M. Ano B.');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0229', 'D-2026-083', '2026-06-30', '2026-07-14', 'Constitution de société', 'Simple', 'Le Notaire', 'YOPOUGON 2', 'Réception des actes',
  NULL, 4000000, 380000, 380000, 'Réglé', NULL, NULL, (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0229' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'SARL Attiéké Premium');

INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
  nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
  valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', '2026/0230', 'D-2026-084', '2026-07-02', '2026-07-16', 'Succession', 'Complexe', 'Clerc 1', 'MAN', 'Réception des actes',
  NULL, 45000000, 850000, 0, 'En attente', NULL, 'Nouveau dossier', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0230' AND etude_id='11111111-1111-1111-1111-111111111111'), 1, 'Héritiers Mme Bohoussou D.');
INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM actes WHERE numero_minute='2026/0230' AND etude_id='11111111-1111-1111-1111-111111111111'),
  'Pièce manquante : Titre foncier', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));

INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 1, 2026, 'Appel Téléphonique', '2026-04-03', '08:20', '2026/0201', 'M. Kouadio A.', '07 08 12 34 56', NULL,
  'Clerc 1', 'Suivi de dossier existant', 'Résolu', 1, '2026-04-04 17:00:00+00', 'Avancement de la vente Cocody', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 2, 2026, 'Appel Téléphonique', '2026-04-07', '09:45', '2026/0202', 'Mme Konan G.', '05 44 22 18 90', NULL,
  'Le Notaire', 'Nouvelle demande', 'Résolu', 1, '2026-04-08 17:00:00+00', 'Ouverture succession de son père', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 3, 2026, 'Courrier Physique', '2026-04-09', '11:00', NULL, 'Mairie de Cocody', NULL, NULL,
  'Formaliste', 'Renseignement général', 'Résolu', 1, '2026-04-10 17:00:00+00', 'Demande d''attestation — Répondu par courrier du 15/04', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 4, 2026, 'Appel Téléphonique', '2026-04-14', '14:30', '2026/0204', 'M. Traoré I.', '01 02 55 66 77', NULL,
  'Clerc 1', 'Réclamation', 'Résolu', 2, '2026-04-15 17:00:00+00', 'Conteste le bornage du voisin — Rendez-vous fixé', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 5, 2026, 'Courrier Électronique', '2026-04-16', '10:15', NULL, 'Mme Assi C.', NULL, 'c.assi@exemple.ci',
  'Clerc 3', 'Demande de rendez-vous', 'Résolu', 1, '2026-04-17 17:00:00+00', 'Projet de donation aux enfants', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 6, 2026, 'Appel Téléphonique', '2026-04-18', '16:05', '2026/0206', 'M. Dosso B.', '07 77 88 99 00', NULL,
  'Clerc 2', 'Suivi de dossier existant', 'Résolu', 1, '2026-04-19 17:00:00+00', 'Statuts de la SARL', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 7, 2026, 'Appel Téléphonique', '2026-04-21', '08:50', NULL, 'Mme Bakayoko S.', '05 11 22 33 44', NULL,
  'Comptabilité', 'Relance paiement', 'Résolu', 3, '2026-04-22 17:00:00+00', 'Facture d''honoraires impayée — Payé le 30/04', NULL);
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 8, 2026, 'Courrier Physique', '2026-04-23', '09:30', '2026/0208', 'Banque Atlantique', NULL, NULL,
  'Le Notaire', 'Suivi de dossier existant', 'Résolu', 1, '2026-04-24 17:00:00+00', 'Pièces du prêt hypothécaire', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 9, 2026, 'Appel Téléphonique', '2026-04-27', '15:40', NULL, 'M. Yeboua T.', '01 55 44 33 22', NULL,
  'Accueil', 'Géo-localisation', 'Résolu', 1, '2026-04-28 17:00:00+00', 'Cherche l''adresse de l''étude', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 10, 2026, 'Appel Téléphonique', '2026-04-28', '11:20', '2026/0209', 'Mme Adjoua-fille', '07 99 00 11 22', NULL,
  'Clerc 3', 'Suivi de dossier existant', 'En attente du Clerc', 4, NULL, 'Succession de sa mère — JAMAIS RAPPELÉE — ⚠ Dossier oublié — à traiter d''urgence', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 11, 2026, 'Appel Téléphonique', '2026-05-05', '09:10', '2026/0211', 'M. Diabaté M.', '+33 6 12 34 56 78', NULL,
  'Le Notaire', 'Suivi de dossier existant', 'Résolu', 2, '2026-05-06 17:00:00+00', 'Procuration depuis la France', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 12, 2026, 'Courrier Électronique', '2026-05-08', '13:25', NULL, 'SCI Horizon', NULL, 'contact@sci-horizon.ci',
  'Clerc 1', 'Nouvelle demande', 'Résolu', 1, '2026-05-09 17:00:00+00', 'Achat immeuble Cocody', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 13, 2026, 'Appel Téléphonique', '2026-05-12', '10:00', '2026/0213', 'M. Séka J.', '05 66 77 88 99', NULL,
  'Clerc 2', 'Suivi de dossier existant', 'Résolu', 2, '2026-05-13 17:00:00+00', 'Attestation villageoise Dabou', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 14, 2026, 'Appel Téléphonique', '2026-05-14', '08:35', NULL, 'Mme Gnaoré P.', '07 12 21 12 21', NULL,
  'Accueil', 'Renseignement général', 'Résolu', 1, '2026-05-15 17:00:00+00', 'Tarifs d''une vente de terrain', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 15, 2026, 'Courrier Physique', '2026-05-18', '14:00', '2026/0216', 'M. Koffi R.', NULL, NULL,
  'Clerc 2', 'Suivi de dossier existant', 'En cours', 2, NULL, 'Recherche du titre foncier — Titre toujours introuvable', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 16, 2026, 'Appel Téléphonique', '2026-05-20', '16:30', NULL, 'M. Silué D.', '01 34 43 34 43', NULL,
  'Le Notaire', 'Demande de rendez-vous', 'Résolu', 1, '2026-05-21 17:00:00+00', 'Création SAS Karité d''Or', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 17, 2026, 'Appel Téléphonique', '2026-05-22', '09:55', '2026/0218', 'M. Aka junior', '05 87 78 87 78', NULL,
  'Clerc 3', 'Réclamation', 'Résolu', 2, '2026-05-23 17:00:00+00', 'Mécontent des délais succession — Famille finalement retirée', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 18, 2026, 'Courrier Électronique', '2026-05-25', '11:45', NULL, 'Notaire confrère Bouaké', NULL, 'etude.bouake@exemple.ci',
  'Le Notaire', 'Suivi de dossier existant', 'Résolu', 1, '2026-05-26 17:00:00+00', 'Demande de copie d''acte', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 19, 2026, 'Appel Téléphonique', '2026-05-27', '15:15', '2026/0219', 'Mme Yao A.', '07 45 54 45 54', NULL,
  'Clerc 1', 'Suivi de dossier existant', 'Résolu', 1, '2026-05-28 17:00:00+00', 'Prêt SGBCI — date de signature', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 20, 2026, 'Courrier Physique', '2026-05-29', '10:30', NULL, 'Direction des Impôts', NULL, NULL,
  'Comptabilité', 'Renseignement général', 'En cours', 1, NULL, 'Demande d''état des enregistrements — ⚠ Réponse à préparer', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 21, 2026, 'Appel Téléphonique', '2026-06-10', '08:40', '2026/0222', 'M. Kacou fils', '05 23 32 23 32', NULL,
  'Clerc 1', 'Suivi de dossier existant', 'Résolu', 1, '2026-06-11 17:00:00+00', 'Succession — certificat de mariage', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 22, 2026, 'Courrier Électronique', '2026-06-15', '09:20', '2026/0224', 'Restaurant Chez Tantie', NULL, 'cheztantie@exemple.ci',
  'Clerc 2', 'Nouvelle demande', 'Résolu', 1, '2026-06-16 17:00:00+00', 'Bail du local Cocody', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 23, 2026, 'Appel Téléphonique', '2026-06-19', '14:50', '2026/0225', 'M. Ipou G.', '07 65 56 65 56', NULL,
  'Le Notaire', 'Relance paiement', 'En attente du Clerc', 3, NULL, 'Frais d''enregistrement impayés — 3e relance sans succès', NULL);
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 24, 2026, 'Appel Téléphonique', '2026-06-25', '10:05', NULL, 'Mme Touré K.', '01 98 89 98 89', NULL,
  'Accueil', 'Renseignement général', 'Résolu', 1, '2026-06-26 17:00:00+00', 'Documents pour une donation', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 25, 2026, 'Courrier Physique', '2026-06-26', '11:30', '2026/0227', 'Sous-préfecture Gagnoa', NULL, NULL,
  'Clerc 3', 'Suivi de dossier existant', 'En cours', 1, NULL, 'Acte de naissance famille Gbagbo', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 26, 2026, 'Appel Téléphonique', '2026-06-29', '09:00', '2026/0228', 'Mme Kramo J.', '05 10 01 10 01', NULL,
  'Clerc 2', 'Suivi de dossier existant', 'En attente du Clerc', 2, NULL, 'Avancement vente Bingerville', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 27, 2026, 'Courrier Électronique', '2026-06-30', '16:20', NULL, 'M. Ouédraogo Z.', NULL, 'z.ouedraogo@exemple.ci',
  'Le Notaire', 'Nouvelle demande', 'En cours', 1, NULL, 'Achat terrain Yopougon — Devis à envoyer', (SELECT id FROM utilisateurs WHERE identifiant='secretariat' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 28, 2026, 'Appel Téléphonique', '2026-07-01', '08:30', '2026/0230', 'Héritier Bohoussou', '07 31 13 31 13', NULL,
  'Clerc 1', 'Nouvelle demande', 'En cours', 1, NULL, 'Succession de sa mère — pièces à fournir — Liste des pièces envoyée', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 29, 2026, 'Appel Téléphonique', '2026-07-03', '10:45', NULL, 'M. Amani F.', '01 27 72 27 72', NULL,
  'Accueil', 'Demande de rendez-vous', 'En attente du Clerc', 1, NULL, 'Consultation création d''entreprise — RDV à caler cette semaine', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));
INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
  reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
  nb_tentatives, resolu_le, observations, saisi_par)
VALUES ('11111111-1111-1111-1111-111111111111', 30, 2026, 'Appel Téléphonique', '2026-07-04', '08:15', NULL, 'Mme Bléou M.', '05 63 36 63 36', NULL,
  'Le Notaire', 'Nouvelle demande', 'Non commencé', 0, NULL, 'Vente d''une parcelle à Songon — Reçue ce matin', (SELECT id FROM utilisateurs WHERE identifiant='accueil' AND etude_id='11111111-1111-1111-1111-111111111111'));