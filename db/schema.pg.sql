-- NOTARIA — Schéma PostgreSQL (production Render)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS etudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  email_gmail_notaire VARCHAR(255) UNIQUE,
  email_gmail_partage VARCHAR(255),
  statut VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (statut IN ('active','desactivee')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin','admin_etude','collaborateur')),
  identifiant VARCHAR(100) NOT NULL,
  nom_affiche VARCHAR(150) NOT NULL,
  fonction VARCHAR(60),
  email_rattachement VARCHAR(255),
  hash_mot_de_passe VARCHAR(255) NOT NULL,
  doit_changer_mdp BOOLEAN NOT NULL DEFAULT true,
  actif BOOLEAN NOT NULL DEFAULT true,
  echecs_connexion INT NOT NULL DEFAULT 0,
  verrouille_jusqua TIMESTAMPTZ,
  derniere_activite TIMESTAMPTZ,
  nom_complet VARCHAR,
  niveau_acces VARCHAR NOT NULL DEFAULT 'standard'
    CHECK (niveau_acces IN ('administrateur','notaire_salarie','comptable','standard')),
  mfa_active BOOLEAN NOT NULL DEFAULT false,
  mfa_method VARCHAR(20) NOT NULL DEFAULT 'totp',
  mfa_secret TEXT,
  mfa_backup_codes TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identifiant)
);

CREATE TABLE IF NOT EXISTS appels_courriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  annee INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  type_flux VARCHAR(30) NOT NULL,
  date_entree DATE NOT NULL DEFAULT CURRENT_DATE,
  heure TIME NOT NULL DEFAULT LOCALTIME,
  reference_dossier VARCHAR(50),
  client_nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(30),
  email VARCHAR(255),
  destinataire VARCHAR(60),
  mis_en_relation BOOLEAN,
  motif VARCHAR(80),
  statut_traitement VARCHAR(30) NOT NULL DEFAULT 'Non commencé',
  nb_tentatives INT NOT NULL DEFAULT 0,
  resolu_le TIMESTAMPTZ,
  saisi_par UUID REFERENCES utilisateurs(id),
  observations TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ,
  supprime_le TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_appels_etude ON appels_courriers(etude_id, annee, numero);

CREATE TABLE IF NOT EXISTS actes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero_minute VARCHAR(50) NOT NULL,
  numero_dossier VARCHAR(50),
  date_ouverture DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE NOT NULL DEFAULT CURRENT_DATE + 14,
  nature_acte VARCHAR(100),
  complexite VARCHAR(10) CHECK (complexite IN ('Simple','Complexe')),
  responsable VARCHAR(60),
  conservation_fonciere VARCHAR(60),
  progression VARCHAR(30) NOT NULL DEFAULT 'Rédaction',
  termine_le TIMESTAMPTZ,
  valeur_acte BIGINT NOT NULL DEFAULT 0,
  honoraires_totaux BIGINT NOT NULL DEFAULT 0,
  emoluments BIGINT NOT NULL DEFAULT 0,
  exonere_tva BOOLEAN NOT NULL DEFAULT false,
  droits_etat BIGINT NOT NULL DEFAULT 0,
  debours BIGINT NOT NULL DEFAULT 0,
  debours_rembourses BOOLEAN NOT NULL DEFAULT false,
  prestations_annexes BIGINT NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS acte_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  acte_id UUID NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
  ordre INT NOT NULL DEFAULT 1,
  nom_partie VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS pieces_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  acte_id UUID NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  auteur UUID REFERENCES utilisateurs(id),
  horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  etude_id UUID NOT NULL,
  table_cible VARCHAR(50) NOT NULL,
  ligne_id UUID,
  action VARCHAR(20) NOT NULL,
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  utilisateur UUID,
  horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_etude_horodatage ON audit_log(etude_id, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table_ligne ON audit_log(table_cible, ligne_id);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  type_export VARCHAR(20) NOT NULL DEFAULT 'a_la_demande',
  perimetre VARCHAR(255),
  demande_par UUID REFERENCES utilisateurs(id),
  confirme_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referentiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  type_liste VARCHAR(50) NOT NULL,
  valeur VARCHAR(120) NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_ref_etude ON referentiels(etude_id, type_liste, ordre);

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_activite TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS parametres_etude (
  etude_id UUID PRIMARY KEY REFERENCES etudes(id) ON DELETE CASCADE,
  conservation_annees INT NOT NULL DEFAULT 10 CHECK (conservation_annees BETWEEN 1 AND 10),
  session_minutes INT NOT NULL DEFAULT 30 CHECK (session_minutes IN (15, 30, 60, 120)),
  acte_simple_s1 INT NOT NULL DEFAULT 20, acte_simple_s2 INT NOT NULL DEFAULT 40, acte_simple_s3 INT NOT NULL DEFAULT 60,
  acte_complexe_s1 INT NOT NULL DEFAULT 30, acte_complexe_s2 INT NOT NULL DEFAULT 60, acte_complexe_s3 INT NOT NULL DEFAULT 90,
  succession_s1 INT NOT NULL DEFAULT 180, succession_s2 INT NOT NULL DEFAULT 270, succession_s3 INT NOT NULL DEFAULT 365,
  appel_s1 INT NOT NULL DEFAULT 3, appel_s2 INT NOT NULL DEFAULT 5, appel_s3 INT NOT NULL DEFAULT 10,
  couleur_n1 VARCHAR NOT NULL DEFAULT '#FFF4C2', couleur_n2 VARCHAR NOT NULL DEFAULT '#FFD9A0',
  couleur_n3 VARCHAR NOT NULL DEFAULT '#FF9E9E', couleur_ok VARCHAR NOT NULL DEFAULT '#E9F7EC',
  taux_tva NUMERIC(5,4) NOT NULL DEFAULT 0.18 CHECK (taux_tva >= 0 AND taux_tva <= 1),
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS avis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonction VARCHAR,
  categorie VARCHAR NOT NULL DEFAULT 'Amélioration'
    CHECK (categorie IN ('Amélioration','Difficulté rencontrée','Erreur / bug','Autre')),
  message TEXT NOT NULL,
  recu_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demandes_recuperation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID NOT NULL REFERENCES etudes(id),
  identifiant VARCHAR NOT NULL,
  demande_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  code_confirmation VARCHAR NOT NULL,
  traite_le TIMESTAMPTZ,
  statut VARCHAR NOT NULL DEFAULT 'en_attente'
);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID,
  utilisateur UUID,
  type_evenement VARCHAR(80) NOT NULL,
  severite VARCHAR(20) NOT NULL DEFAULT 'info',
  details JSONB,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_events_etude ON security_events(etude_id, cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type_evenement, cree_le DESC);

CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  nom VARCHAR(120) NOT NULL,
  prix_mensuel BIGINT NOT NULL DEFAULT 0,
  prix_annuel BIGINT NOT NULL DEFAULT 0,
  max_utilisateurs INT NOT NULL DEFAULT 10,
  max_stockage_go INT NOT NULL DEFAULT 10,
  actif BOOLEAN NOT NULL DEFAULT true,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saas_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etude_id UUID UNIQUE REFERENCES etudes(id) ON DELETE CASCADE,
  nom_tenant VARCHAR(160) NOT NULL,
  contact_nom VARCHAR(160),
  contact_email VARCHAR(255),
  statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','suspendu','resilie')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES saas_plans(id),
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE,
  periodicite VARCHAR(20) NOT NULL DEFAULT 'mensuel' CHECK (periodicite IN ('mensuel','annuel')),
  statut VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (statut IN ('active','en_retard','annulee')),
  montant BIGINT NOT NULL DEFAULT 0,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON saas_subscriptions(tenant_id, statut);

CREATE TABLE IF NOT EXISTS saas_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  cle_licence VARCHAR(120) NOT NULL UNIQUE,
  quota_utilisateurs INT NOT NULL DEFAULT 10,
  quota_stockage_go INT NOT NULL DEFAULT 10,
  expire_le DATE,
  statut VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (statut IN ('active','expiree','revoquee')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saas_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES saas_subscriptions(id) ON DELETE SET NULL,
  reference VARCHAR(60) NOT NULL UNIQUE,
  montant BIGINT NOT NULL DEFAULT 0,
  devise VARCHAR(10) NOT NULL DEFAULT 'XOF',
  statut VARCHAR(20) NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','payee','annulee')),
  emission_le DATE NOT NULL DEFAULT CURRENT_DATE,
  echeance_le DATE,
  payee_le DATE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saas_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  sujet VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  priorite VARCHAR(20) NOT NULL DEFAULT 'normale' CHECK (priorite IN ('basse','normale','haute','critique')),
  statut VARCHAR(20) NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert','en_cours','resolu','ferme')),
  cree_par UUID REFERENCES utilisateurs(id),
  assigne_a UUID REFERENCES utilisateurs(id),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saas_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE,
  canal VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (canal IN ('in_app','email','sms')),
  cible VARCHAR(255),
  sujet VARCHAR(160),
  message TEXT NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (statut IN ('queued','sent','failed')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  envoye_le TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS saas_global_settings (
  cle VARCHAR(80) PRIMARY KEY,
  valeur JSONB NOT NULL,
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_par UUID REFERENCES utilisateurs(id)
);

CREATE OR REPLACE FUNCTION refuser_modification_audit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log est immuable';
END $$;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log;
CREATE TRIGGER trg_audit_log_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW EXECUTE FUNCTION refuser_modification_audit();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON audit_log;
CREATE TRIGGER trg_audit_log_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION refuser_modification_audit();

CREATE OR REPLACE FUNCTION prochain_numero_appel(p_etude UUID) RETURNS INT AS $$
  SELECT COALESCE(MAX(numero), 0) + 1 FROM appels_courriers
  WHERE etude_id = p_etude AND annee = EXTRACT(YEAR FROM now());
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION auth_lookup(p_identifiant TEXT)
RETURNS TABLE (id UUID, etude_id UUID, role VARCHAR, nom_affiche VARCHAR, fonction VARCHAR,
               hash_mot_de_passe VARCHAR, doit_changer_mdp BOOLEAN, echecs_connexion INT,
               verrouille_jusqua TIMESTAMPTZ, etude_statut VARCHAR, etude_nom VARCHAR, niveau_acces VARCHAR)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.etude_id, u.role, u.nom_affiche, u.fonction, u.hash_mot_de_passe,
         u.doit_changer_mdp, u.echecs_connexion, u.verrouille_jusqua, e.statut, e.nom, u.niveau_acces
  FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
  WHERE u.identifiant = p_identifiant AND u.actif = true;
$$;

CREATE OR REPLACE FUNCTION auth_apres_tentative(p_user UUID, p_succes BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_succes THEN
    UPDATE utilisateurs SET echecs_connexion = 0, verrouille_jusqua = NULL WHERE id = p_user;
  ELSE
    UPDATE utilisateurs SET echecs_connexion = echecs_connexion + 1,
      verrouille_jusqua = CASE
        WHEN role = 'admin_etude' THEN NULL
        WHEN echecs_connexion + 1 >= 8 THEN now() + interval '1 hour'
        WHEN echecs_connexion + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE verrouille_jusqua END
    WHERE id = p_user;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION compte_etat(p_uid UUID)
RETURNS TABLE (ok BOOLEAN, niveau_acces VARCHAR, fonction VARCHAR)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT (u.actif AND (u.role = 'super_admin' OR e.statut = 'active')
          AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= now())) AS ok,
         u.niveau_acces, u.fonction
  FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
  WHERE u.id = p_uid;
$$;

CREATE OR REPLACE FUNCTION compte_est_actif(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
    WHERE u.id = p_uid AND u.actif = true AND (u.role = 'super_admin' OR e.statut = 'active')
      AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= now()));
$$;

CREATE OR REPLACE FUNCTION marquer_activite(p_uid UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE utilisateurs SET derniere_activite = now() WHERE id = p_uid;
$$;

CREATE OR REPLACE FUNCTION deconnecter_presence(p_uid UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE utilisateurs SET derniere_activite = NULL WHERE id = p_uid;
$$;

CREATE OR REPLACE FUNCTION purger_corbeille_expiree(p_etude UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM actes WHERE etude_id = p_etude AND supprime_le < now() - interval '30 days';
  DELETE FROM appels_courriers WHERE etude_id = p_etude AND supprime_le < now() - interval '30 days';
END $$;

CREATE OR REPLACE FUNCTION purger_registres_demo(p_etude UUID, p_utilisateur UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM actes WHERE etude_id = p_etude AND numero_minute = '2026/0201') THEN
    RAISE EXCEPTION 'Les données présentes ne sont pas celles de la démonstration : effacement refusé.';
  END IF;
  DELETE FROM pieces_log WHERE etude_id = p_etude;
  DELETE FROM acte_parties WHERE etude_id = p_etude;
  DELETE FROM actes WHERE etude_id = p_etude;
  DELETE FROM appels_courriers WHERE etude_id = p_etude;
  INSERT INTO audit_log (etude_id, table_cible, action, nouvelle_valeur, utilisateur)
  VALUES (p_etude, 'actes', 'suppression', '{"evenement":"effacement_demonstration"}', p_utilisateur);
END $$;

-- Recherche de mot de passe : lookup + demande, cross-etude, sans exposer la table
-- utilisateurs à un rôle qui n'a pas encore d'étude connue (même besoin que auth_lookup).
CREATE OR REPLACE FUNCTION demande_recuperation_creer(p_identifiant TEXT, p_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_etude UUID; v_role VARCHAR;
BEGIN
  SELECT etude_id, role INTO v_etude, v_role FROM utilisateurs WHERE identifiant = p_identifiant;
  -- Seul l'Admin d'étude peut déclencher une récupération (cf. C-recuperation : anti-énumération,
  -- la réponse HTTP est identique que la ligne soit insérée ou non).
  IF v_role = 'admin_etude' THEN
    INSERT INTO demandes_recuperation (etude_id, identifiant, code_confirmation)
    VALUES (v_etude, p_identifiant, p_code);
  END IF;
END $$;

-- =============================================================
-- ROW-LEVEL SECURITY — isolation stricte entre études (tenants)
-- =============================================================
-- Toute requête applicative pose d'abord :
--   SELECT set_config('app.current_etude_id', '<uuid de l''étude de la session>', true)
-- (voir withTenant() dans src/lib/db.js). Le moteur refuse alors physiquement toute
-- ligne d'un autre tenant, même en cas de bug applicatif (défense en profondeur).
--
-- Rôle applicatif NON superuser, sans BYPASSRLS : l'application DOIT se connecter
-- avec ce rôle (DATABASE_URL). Le mot de passe ci-dessous est un PLACEHOLDER — à
-- changer immédiatement après la première exécution :
--   ALTER ROLE notaria_app PASSWORD '<mot de passe fort généré>';
-- Les migrations, elles, doivent utiliser ADMIN_DATABASE_URL (rôle propriétaire du
-- schéma, avec BYPASSRLS — cf. procédure de déploiement).
DO $$ BEGIN
  CREATE ROLE notaria_app LOGIN PASSWORD 'changez-moi-immediatement';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['utilisateurs','appels_courriers','actes','acte_parties',
                           'pieces_log','audit_log','exports','referentiels',
                           'parametres_etude','demandes_recuperation'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS isolation_%I ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY isolation_%I ON %I USING (etude_id = current_setting(''app.current_etude_id'', true)::uuid)
       WITH CHECK (etude_id = current_setting(''app.current_etude_id'', true)::uuid)', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO notaria_app', t);
  END LOOP;
END $$;
-- Inviolabilité des journaux : l'application peut écrire, jamais modifier/effacer.
REVOKE UPDATE, DELETE ON audit_log  FROM notaria_app;
REVOKE UPDATE, DELETE ON pieces_log FROM notaria_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO notaria_app;

-- Tables SANS RLS par conception : soit hors périmètre tenant (avis anonyme,
-- security_events = télémétrie plateforme, saas_* = facturation/administration
-- plateforme jamais scopée par étude), soit registre transverse déjà protégé par
-- exigerSuperAdmin() côté application (etudes : la console Super Admin doit lister
-- et provisionner TOUTES les études, une RLS par étude romprait cette fonctionnalité).
GRANT SELECT, INSERT, UPDATE ON etudes TO notaria_app;
GRANT SELECT, INSERT ON avis TO notaria_app;
GRANT SELECT, INSERT ON security_events TO notaria_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON saas_plans, saas_tenants, saas_subscriptions,
  saas_licenses, saas_invoices, saas_support_tickets, saas_notifications, saas_global_settings
  TO notaria_app;

-- Fonctions SECURITY DEFINER : exécutées avec les privilèges du PROPRIÉTAIRE du schéma
-- (le rôle qui a joué cette migration, censé avoir BYPASSRLS), donc elles contournent
-- volontairement la RLS pour leur périmètre strictement défini (auth pré-connexion,
-- purge contrôlée...). Seul notaria_app peut les appeler ; PUBLIC en est exclu.
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'auth_lookup(text)', 'auth_apres_tentative(uuid,boolean)',
    'compte_etat(uuid)', 'compte_est_actif(uuid)',
    'marquer_activite(uuid)', 'deconnecter_presence(uuid)',
    'purger_corbeille_expiree(uuid)', 'purger_registres_demo(uuid,uuid)',
    'demande_recuperation_creer(text,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO notaria_app', f);
  END LOOP;
END $$;

