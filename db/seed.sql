-- =============================================================
-- NOTARIA — Données d'initialisation (référentiels + comptes démo)
-- AUCUNE donnée des fichiers Excel n'est migrée : registres vides.
-- =============================================================

-- Étude pilote
INSERT INTO etudes (id, nom, adresse, email_gmail_notaire, email_gmail_partage)
VALUES ('11111111-1111-1111-1111-111111111111',
        'Étude de Me KOUASSI MARLENE K. ELISEE',
        'Abidjan, Côte d''Ivoire',
        'notaire.kouassi@gmail.com',
        'etude.kouassi@gmail.com')
ON CONFLICT DO NOTHING;

-- Comptes de démonstration — MOTS DE PASSE À CHANGER À LA 1re CONNEXION
-- hash ci-dessous = bcrypt de « ChangezMoi2026! »
INSERT INTO utilisateurs (etude_id, role, identifiant, nom_affiche, nom_complet, fonction, niveau_acces, email_rattachement, hash_mot_de_passe, doit_changer_mdp)
VALUES
('11111111-1111-1111-1111-111111111111','admin_etude','notaire','Me KOUASSI M. K. ELISEE','KOUASSI Marlène K. Élisée','Notaire principal','administrateur','notaire.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('11111111-1111-1111-1111-111111111111','admin_etude','notaire2','Me N''DRI Paul','N''DRI Paul','Notaire salarié','notaire_salarie','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('11111111-1111-1111-1111-111111111111','collaborateur','comptable','Mme Yao Christine','YAO Christine','Comptable','comptable','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('11111111-1111-1111-1111-111111111111','collaborateur','formaliste','M. Bamba Sékou','BAMBA Sékou','Formaliste','standard','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('11111111-1111-1111-1111-111111111111','collaborateur','secretariat','Secrétariat','KOFFI Awa','Secrétariat','standard','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('11111111-1111-1111-1111-111111111111','collaborateur','clerc1','Clerc 1','DIALLO Ibrahim','Clerc de 1ère catégorie','standard','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('11111111-1111-1111-1111-111111111111','collaborateur','accueil','Accueil','TOURÉ Aïcha','Accueil','standard','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true)
ON CONFLICT DO NOTHING;

-- Référentiels par défaut de l'étude pilote
WITH e AS (SELECT '11111111-1111-1111-1111-111111111111'::uuid AS id)
INSERT INTO referentiels (etude_id, type_liste, valeur, ordre)
SELECT e.id, l.type_liste, l.valeur, l.ordre FROM e, (VALUES
  ('type_flux','Appel Téléphonique',1),('type_flux','Courrier Physique',2),('type_flux','Courrier Électronique',3),
('type_flux','Visite Client',4),
  ('destinataire','Le Notaire',1),('destinataire','Clerc 1',2),('destinataire','Clerc 2',3),('destinataire','Clerc 3',4),
  ('destinataire','Comptabilité',5),('destinataire','Formaliste',6),('destinataire','Accueil',7),
  ('motif','Nouvelle demande',1),('motif','Suivi dossier existant',2),('motif','Réclamation',3),('motif','RDV',4),
  ('motif','Renseignement général',5),('motif','Relance paiement',6),('motif','Géo-localisation',7),
  ('statut_traitement','Non commencé',1),('statut_traitement','En cours',2),('statut_traitement','En attente du Clerc',3),('statut_traitement','Résolu',4),
  ('nature_acte','Société',1),('nature_acte','Bail',2),('nature_acte','Vente',3),('nature_acte','Achat',4),
  ('nature_acte','Donation',5),('nature_acte','Succession',6),('nature_acte','Ouverture de Crédit',7),
  ('nature_acte','Mainlevée d''Hypothèque',8),('nature_acte','Procuration',9),('nature_acte','Contrat de Mariage',10),
  ('nature_acte','Légalisation',11),('nature_acte','Adoption',12),('nature_acte','Reconnaissance d''Enfant Naturel',13),
  ('nature_acte','Dation en Paiement',14),('nature_acte','Autres',15),
  ('responsable','Le Notaire',1),('responsable','Clerc 1',2),('responsable','Clerc 2',3),('responsable','Clerc 3',4),
  ('progression','Recensement des informations',1),('progression','Paiement',2),('progression','Formalité antérieure',3),
  ('progression','Rédaction',4),('progression','Signature',5),('progression','Préparation des formalités',6),
  ('progression','Dépôt des formalités',7),('progression','Retrait de la minute',8),('progression','Réception de l''état foncier',9),
  ('progression','Réception du CMPF',10),('progression','Transmission client',11),('progression','Terminé',12),('progression','Annulé',13),
  ('statut_paiement','Réglé',1),('statut_paiement','Partiel',2),('statut_paiement','En attente',3),
  ('conservation_fonciere','ABENGOUROU',1),('conservation_fonciere','ABOBO',2),('conservation_fonciere','ADZOPE',3),
  ('conservation_fonciere','AGBOVILLE',4),('conservation_fonciere','BINGERVILLE',5),('conservation_fonciere','BONDOUKOU',6),
  ('conservation_fonciere','BOUAFLE',7),('conservation_fonciere','BOUAKE',8),('conservation_fonciere','COCODY',9),
  ('conservation_fonciere','DABOU',10),('conservation_fonciere','DALOA',11),('conservation_fonciere','DIMBOKRO',12),
  ('conservation_fonciere','DIVO',13),('conservation_fonciere','GAGNOA',14),('conservation_fonciere','GRAND-BASSAM',15),
  ('conservation_fonciere','GUIGLO',16),('conservation_fonciere','KORHOGO',17),('conservation_fonciere','MAN',18),
  ('conservation_fonciere','MARCORY',19),('conservation_fonciere','ODIENNE',20),('conservation_fonciere','PLATEAU',21),
  ('conservation_fonciere','RIVIERA',22),('conservation_fonciere','SAN PEDRO',23),('conservation_fonciere','SEGUELA',24),
  ('conservation_fonciere','SONGON',25),('conservation_fonciere','TREICHVILLE',26),('conservation_fonciere','YAMOUSSOUKRO',27),
  ('conservation_fonciere','YOPOUGON 1',28),('conservation_fonciere','YOPOUGON 2',29)
) AS l(type_liste, valeur, ordre);

-- Paramètres par défaut de l'étude pilote (barèmes validés)
INSERT INTO parametres_etude (etude_id) VALUES ('11111111-1111-1111-1111-111111111111')
ON CONFLICT (etude_id) DO NOTHING;
