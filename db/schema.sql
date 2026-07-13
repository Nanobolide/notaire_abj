-- =============================================================
-- NOTARIA — Schéma PostgreSQL avec Row-Level Security (RLS)
-- Isolation stricte entre études : exigence critique n°1
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rôle applicatif NON superuser : la RLS ne s'applique pas aux superusers.
-- L'application doit se connecter avec ce rôle (cf. DATABASE_URL).
DO $$ BEGIN
  CREATE ROLE notaria_app LOGIN PASSWORD 'motdepasse';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================= TABLES =============================
CREATE TABLE IF NOT EXISTS etudes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  email_gmail_notaire VARCHAR(255) UNIQUE,
  email_gmail_partage VARCHAR(255),
  statut VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (statut IN ('active','desactivee')),
  forfait VARCHAR(20) NOT NULL DEFAULT 'essentiel'
    CHECK (forfait IN ('ami','essentiel','pro','pro_max')),   -- P9 — classement des études
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Réglages globaux de la plateforme, pilotés par le Super Administrateur.
-- Table à clé/valeur : simple, extensible, sans impact sur l'existant.
CREATE TABLE IF NOT EXISTS reglages_plateforme (
  cle VARCHAR(60) PRIMARY KEY,
  valeur TEXT NOT NULL,
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Valeurs de départ : le service d'offres est ÉTEINT ; les distinctions de forfait NON appliquées.
INSERT INTO reglages_plateforme (cle, valeur) VALUES
  ('offres_actives', 'false'),
  ('forfaits_restrictions_actives', 'false'),
  ('annonces_visibles_par', 'tous')          -- 'tous' = notaire + collaborateurs ; 'notaire' = notaire seul
 ON CONFLICT (cle) DO NOTHING;

-- P10 — Annonces diffusées par le Super Administrateur vers les études.
CREATE TABLE IF NOT EXISTS annonces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(24) NOT NULL DEFAULT 'information'
    CHECK (type IN ('information','mise_a_jour','maintenance','proposition_vente','proposition_achat')),
  -- Champs propres aux offres immobilières (jamais de donnée nominative du client) :
  bien_ville VARCHAR(120),
  bien_prix BIGINT,
  contact_etude VARCHAR(160),
  cible VARCHAR(20) NOT NULL DEFAULT 'toutes'
    CHECK (cible IN ('toutes','selection','forfait')),
  forfait_cible VARCHAR(20),                    -- si cible = 'forfait'
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  cree_par UUID
);

-- Destinataires explicites quand cible = 'selection'.
CREATE TABLE IF NOT EXISTS annonce_etudes (
  annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  PRIMARY KEY (annonce_id, etude_id)
);

-- Suivi de lecture par étude (cloche : lu / non lu).
CREATE TABLE IF NOT EXISTS annonce_lectures (
  annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  lu_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (annonce_id, etude_id)
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin','admin_etude','collaborateur')),
  identifiant VARCHAR(100) NOT NULL,
  nom_affiche VARCHAR(150) NOT NULL,
  fonction VARCHAR(60),                        -- Secrétariat, Clerc 1..3, Accueil, Intérim, Stagiaire...
  email_rattachement VARCHAR(255),
  hash_mot_de_passe VARCHAR(255) NOT NULL,
  doit_changer_mdp BOOLEAN NOT NULL DEFAULT true,
  actif BOOLEAN NOT NULL DEFAULT true,
  echecs_connexion INT NOT NULL DEFAULT 0,
  verrouille_jusqua TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  derniere_activite TIMESTAMPTZ,
  nom_complet VARCHAR,
  niveau_acces VARCHAR NOT NULL DEFAULT 'standard'
    CHECK (niveau_acces IN ('administrateur','notaire_salarie','comptable','standard','renseignement')),
  -- C6 : la connexion cherche l'identifiant dans TOUTES les études,
  -- l'unicité doit donc être GLOBALE (et non par étude) pour éviter toute collision.
  UNIQUE (identifiant)
);

CREATE TABLE IF NOT EXISTS appels_courriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero INT NOT NULL,                          -- incrément par étude+année (calculé à l'insertion)
  annee INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  type_flux VARCHAR(30) NOT NULL,               -- Appel Téléphonique / Courrier Physique / Courrier Électronique / Visite Client
  date_entree DATE NOT NULL DEFAULT CURRENT_DATE,
  heure TIME NOT NULL DEFAULT LOCALTIME,        -- capturée auto, modifiable (régularisation tracée en audit)
  reference_dossier VARCHAR(50),
  client_nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(30),
  email VARCHAR(255),
  destinataire VARCHAR(60),
  mis_en_relation BOOLEAN,
  motif VARCHAR(80),
  statut_traitement VARCHAR(30) NOT NULL DEFAULT 'Non commencé',
  nb_tentatives INT NOT NULL DEFAULT 0,
  resolu_le TIMESTAMPTZ,                        -- posé quand statut passe à Résolu : fige les jours écoulés
  saisi_par UUID REFERENCES utilisateurs(id),   -- renseigné par la session, jamais saisi à la main
  observations TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ,
  supprime_le TIMESTAMPTZ                       -- corbeille (Admin uniquement)
);
CREATE INDEX IF NOT EXISTS idx_appels_etude ON appels_courriers(etude_id, annee, numero);
-- Unicité des numéros d'appel par étude et par année (hors corbeille)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_appel_numero
  ON appels_courriers(etude_id, annee, numero) WHERE supprime_le IS NULL;

CREATE TABLE IF NOT EXISTS actes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero_minute VARCHAR(50) NOT NULL,
  numero_dossier VARCHAR(50),
  date_ouverture DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE NOT NULL DEFAULT CURRENT_DATE + 14,  -- J+14 par défaut, modifiable
  nature_acte VARCHAR(100),
  complexite VARCHAR(10) CHECK (complexite IN ('Simple','Complexe')),
  responsable VARCHAR(60),
  conservation_fonciere VARCHAR(60),
  progression VARCHAR(30) NOT NULL DEFAULT 'Rédaction',
  termine_le TIMESTAMPTZ,                       -- posé à Terminé/Annulé : fige le délai
  valeur_acte BIGINT NOT NULL DEFAULT 0,        -- FCFA
  honoraires_totaux BIGINT NOT NULL DEFAULT 0,
  -- v2.3 — ventilation comptable : émoluments (revenu), droits d'État (Trésor), débours (avances)
  emoluments BIGINT NOT NULL DEFAULT 0,
  exonere_tva BOOLEAN NOT NULL DEFAULT false,
  droits_etat BIGINT NOT NULL DEFAULT 0,
  debours BIGINT NOT NULL DEFAULT 0,
  prestations_annexes BIGINT NOT NULL DEFAULT 0,
  -- Autres dépenses : redressement, imprévu… Facultatif, 0 si rien.
  autres_depenses BIGINT NOT NULL DEFAULT 0,
  autres_depenses_motif VARCHAR,
  depenses_formalites BIGINT NOT NULL DEFAULT 0,
  statut_formalites VARCHAR NOT NULL DEFAULT 'Pas encore débuté'
    CHECK (statut_formalites IN ('Pas encore débuté','Débuté','En cours','Terminé')),
  montant_regle BIGINT NOT NULL DEFAULT 0,
  statut_paiement VARCHAR(20) NOT NULL DEFAULT 'En attente',
  difficultes TEXT,
  observations TEXT,
  saisi_par UUID REFERENCES utilisateurs(id),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ,
  supprime_le TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_actes_etude ON actes(etude_id);
-- Unicité du numéro de minute par étude (hors corbeille)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_acte_minute
  ON actes(etude_id, numero_minute) WHERE supprime_le IS NULL;

CREATE TABLE IF NOT EXISTS acte_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  acte_id UUID NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
  ordre INT NOT NULL DEFAULT 1,
  nom_partie VARCHAR(255) NOT NULL
);

-- Journal historisé des pièces manquantes : append-only, rien ne se modifie ni ne s'efface
CREATE TABLE IF NOT EXISTS pieces_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  acte_id UUID NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,                          -- saisie libre, aucun commentaire obligatoire ailleurs
  auteur UUID REFERENCES utilisateurs(id),
  horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  etude_id UUID NOT NULL,
  table_cible VARCHAR(50) NOT NULL,
  ligne_id UUID,
  action VARCHAR(20) NOT NULL,                  -- creation / modification / suppression / restauration / connexion
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  utilisateur UUID,
  horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parametres_etude (
  etude_id UUID PRIMARY KEY REFERENCES etudes(id) ON DELETE CASCADE,
  -- Conservation des données (années) et durée de session (minutes)
  conservation_annees INT NOT NULL DEFAULT 10 CHECK (conservation_annees BETWEEN 1 AND 10),
  session_minutes INT NOT NULL DEFAULT 30 CHECK (session_minutes IN (15, 30, 60, 120)),
  -- Barèmes de délais (jours) — 3 seuils par type. Valeurs par défaut = barèmes validés.
  acte_simple_s1 INT NOT NULL DEFAULT 20,  acte_simple_s2 INT NOT NULL DEFAULT 40,  acte_simple_s3 INT NOT NULL DEFAULT 60,
  acte_complexe_s1 INT NOT NULL DEFAULT 30, acte_complexe_s2 INT NOT NULL DEFAULT 60, acte_complexe_s3 INT NOT NULL DEFAULT 90,
  succession_s1 INT NOT NULL DEFAULT 180, succession_s2 INT NOT NULL DEFAULT 270, succession_s3 INT NOT NULL DEFAULT 365,
  appel_s1 INT NOT NULL DEFAULT 3, appel_s2 INT NOT NULL DEFAULT 5, appel_s3 INT NOT NULL DEFAULT 10,
  -- Couleurs des alertes (personnalisables par le Notaire ; défauts = teintes validées)
  couleur_n1 VARCHAR NOT NULL DEFAULT '#FFF4C2',  -- jaune (1er seuil)
  couleur_n2 VARCHAR NOT NULL DEFAULT '#FFD9A0',  -- orange (2e seuil)
  couleur_n3 VARCHAR NOT NULL DEFAULT '#FF9E9E',  -- rouge (3e seuil)
  couleur_ok VARCHAR NOT NULL DEFAULT '#E9F7EC',  -- vert pâle (terminé/résolu)
  taux_tva NUMERIC(5,4) NOT NULL DEFAULT 0.18 CHECK (taux_tva >= 0 AND taux_tva <= 1),
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE parametres_etude ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS demandes_recuperation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id),
  identifiant VARCHAR NOT NULL,
  demande_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  code_confirmation VARCHAR NOT NULL,
  traite_le TIMESTAMPTZ,
  statut VARCHAR NOT NULL DEFAULT 'en_attente'
);
ALTER TABLE demandes_recuperation ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  type_export VARCHAR(20) NOT NULL DEFAULT 'a_la_demande',
  perimetre VARCHAR(255),
  demande_par UUID REFERENCES utilisateurs(id),
  confirme_le TIMESTAMPTZ,                      -- condition préalable à toute purge décennale
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referentiels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  type_liste VARCHAR(50) NOT NULL,              -- motif, destinataire, nature_acte, conservation_fonciere...
  valeur VARCHAR(120) NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_ref_etude ON referentiels(etude_id, type_liste, ordre);

-- ==================== ROW-LEVEL SECURITY ====================
-- Toute requête applicative pose d'abord :
--   SET LOCAL app.current_etude_id = '<uuid de l''étude de la session>'
-- Le moteur refuse alors physiquement toute ligne d'un autre tenant,
-- même en cas de bug applicatif (défense en profondeur, niveau 1).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['utilisateurs','appels_courriers','actes','acte_parties',
                           'pieces_log','audit_log','exports','referentiels'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS isolation_%I ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY isolation_%I ON %I USING (etude_id = current_setting(''app.current_etude_id'', true)::uuid)
       WITH CHECK (etude_id = current_setting(''app.current_etude_id'', true)::uuid)', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO notaria_app', t);
  END LOOP;
END $$;
GRANT SELECT ON etudes TO notaria_app;
-- P9 — le super_admin (via l'app) peut lire et changer le forfait d'une étude.
GRANT UPDATE (forfait, statut) ON etudes TO notaria_app;
-- P10 — annonces : pas de RLS par étude (portée globale, contrôlée côté application).
GRANT SELECT, INSERT, UPDATE, DELETE ON annonces TO notaria_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON annonce_etudes TO notaria_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON annonce_lectures TO notaria_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON reglages_plateforme TO notaria_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO notaria_app;

-- Numérotation automatique par étude et par année
CREATE OR REPLACE FUNCTION prochain_numero_appel(p_etude UUID) RETURNS INT AS $$
  SELECT COALESCE(MAX(numero), 0) + 1 FROM appels_courriers
  WHERE etude_id = p_etude AND annee = EXTRACT(YEAR FROM now());
$$ LANGUAGE sql;

-- ==================== AUTHENTIFICATION ====================
-- La RLS empêche (à juste titre) de lire `utilisateurs` avant de connaître l'étude.
-- La connexion passe donc par deux fonctions SECURITY DEFINER au périmètre minimal :
-- elles ne renvoient que ce qui est nécessaire à la vérification du mot de passe.
CREATE OR REPLACE FUNCTION auth_lookup(p_identifiant TEXT)
RETURNS TABLE (id UUID, etude_id UUID, role VARCHAR, nom_affiche VARCHAR,
               hash_mot_de_passe VARCHAR, doit_changer_mdp BOOLEAN,
               echecs_connexion INT, verrouille_jusqua TIMESTAMPTZ,
               etude_statut VARCHAR, etude_nom VARCHAR, fonction VARCHAR, niveau_acces VARCHAR)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.etude_id, u.role, u.nom_affiche, u.hash_mot_de_passe,
         u.doit_changer_mdp, u.echecs_connexion, u.verrouille_jusqua, e.statut, e.nom, u.fonction, u.niveau_acces
  FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
  WHERE u.identifiant = p_identifiant AND u.actif = true;
$$;

CREATE OR REPLACE FUNCTION auth_apres_tentative(p_user UUID, p_succes BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_succes THEN
    UPDATE utilisateurs SET echecs_connexion = 0, verrouille_jusqua = NULL WHERE id = p_user;
  ELSE
    -- C8 — verrouillage TEMPORAIRE et progressif (pas définitif), et JAMAIS pour l'admin d'étude :
    -- un tiers ne peut donc pas paralyser durablement l'étude en épuisant les tentatives.
    -- 5 échecs => 15 min ; au-delà, plafonné à 1 h. L'admin n'est jamais verrouillé.
    UPDATE utilisateurs SET echecs_connexion = echecs_connexion + 1,
      verrouille_jusqua = CASE
        WHEN role = 'admin_etude' THEN NULL
        WHEN echecs_connexion + 1 >= 8 THEN now() + interval '1 hour'
        WHEN echecs_connexion + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE verrouille_jusqua END
    WHERE id = p_user;
  END IF;
END $$;

REVOKE ALL ON FUNCTION auth_lookup(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_apres_tentative(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_lookup(TEXT) TO notaria_app;
GRANT EXECUTE ON FUNCTION auth_apres_tentative(UUID, BOOLEAN) TO notaria_app;


-- ==================== INVIOLABILITÉ DES JOURNAUX (moteur) ====================
-- L'application peut ÉCRIRE dans les journaux, jamais les modifier ni les effacer.
REVOKE UPDATE, DELETE ON audit_log  FROM notaria_app;
REVOKE UPDATE, DELETE ON pieces_log FROM notaria_app;

-- Purge de démonstration : seule voie d'effacement des registres, contrôlée et journalisée.
-- Refuse d'agir si le marqueur de démonstration (minute 2026/0201) est absent.
CREATE OR REPLACE FUNCTION purger_registres_demo(p_etude UUID, p_utilisateur UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM actes WHERE etude_id = p_etude AND numero_minute = '2026/0201') THEN
    RAISE EXCEPTION 'Les données présentes ne sont pas celles de la démonstration : effacement refusé.';
  END IF;
  DELETE FROM pieces_log       WHERE etude_id = p_etude;
  DELETE FROM acte_parties     WHERE etude_id = p_etude;
  DELETE FROM actes            WHERE etude_id = p_etude;
  DELETE FROM appels_courriers WHERE etude_id = p_etude;
  INSERT INTO audit_log (etude_id, table_cible, action, nouvelle_valeur, utilisateur)
  VALUES (p_etude, 'actes', 'suppression', '{"evenement":"effacement_demonstration"}', p_utilisateur);
END $$;
REVOKE ALL ON FUNCTION purger_registres_demo(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purger_registres_demo(UUID, UUID) TO notaria_app;


-- C7 — Vérification d'état du compte à chaque requête (révocation immédiate).
CREATE OR REPLACE FUNCTION compte_est_actif(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
    WHERE u.id = p_uid AND u.actif = true AND e.statut = 'active'
      AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= now()));
$$;
REVOKE ALL ON FUNCTION compte_est_actif(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION compte_est_actif(UUID) TO notaria_app;


-- I6 — Purge effective de la corbeille : supprime définitivement ce qui dépasse 30 jours.
CREATE OR REPLACE FUNCTION purger_corbeille_expiree(p_etude UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM actes            WHERE etude_id = p_etude AND supprime_le < now() - interval '30 days';
  DELETE FROM appels_courriers WHERE etude_id = p_etude AND supprime_le < now() - interval '30 days';
END $$;
REVOKE ALL ON FUNCTION purger_corbeille_expiree(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purger_corbeille_expiree(UUID) TO notaria_app;


-- Purge décennale : recense ce qui dépasse 10 ans (à exporter AVANT tout effacement).
CREATE OR REPLACE FUNCTION actes_decennaux(p_etude UUID)
RETURNS TABLE (id UUID, numero_minute VARCHAR, date_ouverture DATE)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, numero_minute, date_ouverture FROM actes
  WHERE etude_id = p_etude AND supprime_le IS NULL
    AND date_ouverture < (CURRENT_DATE - interval '10 years');
$$;
REVOKE ALL ON FUNCTION actes_decennaux(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION actes_decennaux(UUID) TO notaria_app;


-- RLS des tables de paramétrage et de récupération
CREATE POLICY tenant_isolation_parametres ON parametres_etude
  USING (etude_id = current_setting('app.current_etude_id', true)::uuid);
CREATE POLICY tenant_isolation_demandes ON demandes_recuperation
  USING (etude_id = current_setting('app.current_etude_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE ON parametres_etude TO notaria_app;
GRANT SELECT, INSERT, UPDATE ON demandes_recuperation TO notaria_app;


-- Présence : marque la dernière activité de l'utilisateur (appelée à chaque requête authentifiée).
CREATE OR REPLACE FUNCTION marquer_activite(p_uid UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE utilisateurs SET derniere_activite = now() WHERE id = p_uid;
$$;
REVOKE ALL ON FUNCTION marquer_activite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marquer_activite(UUID) TO notaria_app;


-- Présence : à la déconnexion, remet l'utilisateur hors ligne immédiatement.
CREATE OR REPLACE FUNCTION deconnecter_presence(p_uid UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE utilisateurs SET derniere_activite = NULL WHERE id = p_uid;
$$;
REVOKE ALL ON FUNCTION deconnecter_presence(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deconnecter_presence(UUID) TO notaria_app;


-- C14 — Révocation IMMÉDIATE des privilèges : le niveau d'accès et la fonction sont lus
-- en base à chaque requête. Rétrograder un collaborateur prend effet sur-le-champ.
CREATE OR REPLACE FUNCTION compte_etat(p_uid UUID)
RETURNS TABLE (ok BOOLEAN, niveau_acces VARCHAR, fonction VARCHAR)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT (u.actif AND e.statut = 'active'
          AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= now())) AS ok,
         u.niveau_acces, u.fonction
  FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
  WHERE u.id = p_uid;
$$;
REVOKE ALL ON FUNCTION compte_etat(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION compte_etat(UUID) TO notaria_app;


-- N°28 — Avis des collaborateurs. ANONYME PAR CONSTRUCTION : aucune colonne ne relie
-- l'avis à un utilisateur ni à une étude. Seule la fonction (Clerc, Comptable…) est
-- enregistrée, pour situer la remarque. Il n'existe aucun moyen, même en base, de
-- retrouver l'auteur d'un avis.
CREATE TABLE IF NOT EXISTS avis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonction VARCHAR,
  categorie VARCHAR NOT NULL DEFAULT 'Amélioration'
    CHECK (categorie IN ('Amélioration','Difficulté rencontrée','Erreur / bug','Autre')),
  message TEXT NOT NULL,
  recu_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Pas de RLS par étude : l'avis ne porte aucune référence d'étude (anonymat).
-- Le rôle applicatif peut écrire, mais jamais relire ni modifier (l'auteur ne peut pas
-- se dénoncer par recoupement, et personne dans l'étude ne peut lire les avis).
REVOKE ALL ON TABLE avis FROM notaria_app;
GRANT INSERT ON TABLE avis TO notaria_app;
