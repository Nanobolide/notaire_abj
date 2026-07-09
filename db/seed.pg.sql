-- NOTARIA — Données d'initialisation PostgreSQL

INSERT INTO etudes (id, nom, adresse, email_gmail_notaire, email_gmail_partage)
VALUES ('11111111-1111-1111-1111-111111111111',
        'Étude de Me KOUASSI MARLENE K. ELISEE',
        'Abidjan, Côte d''Ivoire',
        'notaire.kouassi@gmail.com',
        'etude.kouassi@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO utilisateurs (id, etude_id, role, identifiant, nom_affiche, fonction, email_rattachement, hash_mot_de_passe, doit_changer_mdp)
VALUES
('a0000001-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','admin_etude','notaire','Me KOUASSI M. K. ELISEE','Notaire','notaire.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('a0000002-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','collaborateur','secretariat','Secrétariat','Secrétariat','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('a0000003-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','collaborateur','clerc1','Clerc 1','Clerc 1','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true),
('a0000004-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','collaborateur','accueil','Accueil','Accueil','etude.kouassi@gmail.com','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true)
ON CONFLICT (etude_id, identifiant) DO NOTHING;

INSERT INTO utilisateurs (id, etude_id, role, identifiant, nom_affiche, fonction, email_rattachement, hash_mot_de_passe, doit_changer_mdp, niveau_acces)
VALUES ('a0000005-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','super_admin','superadmin','Super Administrateur','Direction Produit','support@notaria.ci','$2a$10$tHzz3v3qkozJJaSqT2fnXeGoQ10z6cTyHyanu.nDyu5STWYMdxXkm',true,'administrateur')
ON CONFLICT (identifiant) DO NOTHING;

INSERT INTO referentiels (etude_id, type_liste, valeur, ordre)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, l.type_liste, l.valeur, l.ordre FROM (VALUES
  ('type_flux','Appel Téléphonique',1),('type_flux','Courrier Physique',2),('type_flux','Courrier Électronique',3),
  ('destinataire','Le Notaire',1),('destinataire','Clerc 1',2),('destinataire','Clerc 2',3),('destinataire','Clerc 3',4),
  ('destinataire','Comptabilité',5),('destinataire','Formaliste',6),('destinataire','Accueil',7),
  ('motif','Nouvelle demande',1),('motif','Suivi dossier existant',2),('motif','Réclamation',3),('motif','RDV',4),
  ('motif','Renseignement général',5),('motif','Relance paiement',6),('motif','Géo-localisation',7),
  ('statut_traitement','Non commencé',1),('statut_traitement','En cours',2),('statut_traitement','En attente du Clerc',3),('statut_traitement','Résolu',4),
  ('nature_acte','Vente immobilière',1),('nature_acte','Succession',2),('nature_acte','Donation',3),
  ('nature_acte','Bail commercial',4),('nature_acte','Vente de terrain urbain',5),
  ('progression','Rédaction',1),('progression','Formalités',2),('progression','Signature',3),
  ('progression','État Foncier',4),('progression','Transmission client',5),('progression','Terminé',6),('progression','Annulé',7),
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
) AS l(type_liste, valeur, ordre)
WHERE NOT EXISTS (
  SELECT 1 FROM referentiels r
  WHERE r.etude_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND r.type_liste = l.type_liste AND r.valeur = l.valeur
);
