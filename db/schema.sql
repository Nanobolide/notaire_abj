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
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
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
  UNIQUE (etude_id, identifiant)
);

CREATE TABLE IF NOT EXISTS appels_courriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero INT NOT NULL,                          -- incrément par étude+année (calculé à l'insertion)
  annee INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  type_flux VARCHAR(30) NOT NULL,               -- Appel Téléphonique / Courrier Physique / Courrier Électronique
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
               echecs_connexion INT, verrouille_jusqua TIMESTAMPTZ, etude_statut VARCHAR)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.etude_id, u.role, u.nom_affiche, u.hash_mot_de_passe,
         u.doit_changer_mdp, u.echecs_connexion, u.verrouille_jusqua, e.statut
  FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
  WHERE u.identifiant = p_identifiant AND u.actif = true;
$$;

CREATE OR REPLACE FUNCTION auth_apres_tentative(p_user UUID, p_succes BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_succes THEN
    UPDATE utilisateurs SET echecs_connexion = 0 WHERE id = p_user;
  ELSE
    UPDATE utilisateurs SET echecs_connexion = echecs_connexion + 1,
      verrouille_jusqua = CASE WHEN echecs_connexion + 1 >= 5
        THEN now() + interval '100 years' ELSE verrouille_jusqua END
    WHERE id = p_user;
  END IF;
END $$;

REVOKE ALL ON FUNCTION auth_lookup(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_apres_tentative(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_lookup(TEXT) TO notaria_app;
GRANT EXECUTE ON FUNCTION auth_apres_tentative(UUID, BOOLEAN) TO notaria_app;
