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
-- avec ce rôle (DATABASE_URL).
--
-- Bootstrap MANUEL, une seule fois par base, par un DBA (volontairement PAS fait
-- par cette migration : la créer ici exigerait de donner CREATEROLE au rôle qui
-- joue les migrations, un privilège plus large que ce dont cette migration a besoin) :
--   CREATE ROLE notaria_app LOGIN PASSWORD '<mot de passe fort généré>';
--   ALTER ROLE <role propriétaire du schéma> BYPASSRLS;  -- ex. notaria_user
-- Puis renseigner DATABASE_URL=...notaria_app... et ADMIN_DATABASE_URL=...<propriétaire>...
-- (cf. .env.example). Cette migration échoue explicitement si l'étape a été oubliée.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'notaria_app') THEN
    RAISE EXCEPTION 'Rôle notaria_app introuvable — bootstrap DBA requis, voir le commentaire ci-dessus (0003_row_level_security.sql).';
  END IF;
END $$;

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

