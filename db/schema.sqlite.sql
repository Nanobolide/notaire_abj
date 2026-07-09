-- NOTARIA — Schéma SQLite (développement local)

CREATE TABLE IF NOT EXISTS etudes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT,
  email_gmail_notaire TEXT UNIQUE,
  email_gmail_partage TEXT,
  statut TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active','desactivee')),
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin_etude','collaborateur')),
  identifiant TEXT NOT NULL,
  nom_affiche TEXT NOT NULL,
  fonction TEXT,
  email_rattachement TEXT,
  hash_mot_de_passe TEXT NOT NULL,
  doit_changer_mdp INTEGER NOT NULL DEFAULT 1,
  actif INTEGER NOT NULL DEFAULT 1,
  echecs_connexion INTEGER NOT NULL DEFAULT 0,
  verrouille_jusqua TEXT,
  derniere_activite TEXT,
  nom_complet TEXT,
  niveau_acces TEXT NOT NULL DEFAULT 'standard'
    CHECK (niveau_acces IN ('administrateur','notaire_salarie','comptable','standard')),
  mfa_active INTEGER NOT NULL DEFAULT 0,
  mfa_method TEXT NOT NULL DEFAULT 'totp',
  mfa_secret TEXT,
  mfa_backup_codes TEXT,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (identifiant)
);

CREATE TABLE IF NOT EXISTS appels_courriers (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  annee INTEGER NOT NULL DEFAULT (cast(strftime('%Y','now') AS INTEGER)),
  type_flux TEXT NOT NULL,
  date_entree TEXT NOT NULL DEFAULT (date('now')),
  heure TEXT NOT NULL DEFAULT (time('now')),
  reference_dossier TEXT,
  client_nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  destinataire TEXT,
  mis_en_relation INTEGER,
  motif TEXT,
  statut_traitement TEXT NOT NULL DEFAULT 'Non commencé',
  nb_tentatives INTEGER NOT NULL DEFAULT 0,
  resolu_le TEXT,
  saisi_par TEXT REFERENCES utilisateurs(id),
  observations TEXT,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT,
  supprime_le TEXT
);
CREATE INDEX IF NOT EXISTS idx_appels_etude ON appels_courriers(etude_id, annee, numero);

CREATE TABLE IF NOT EXISTS actes (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  numero_minute TEXT NOT NULL,
  numero_dossier TEXT,
  date_ouverture TEXT NOT NULL DEFAULT (date('now')),
  date_echeance TEXT NOT NULL DEFAULT (date('now', '+14 days')),
  nature_acte TEXT,
  complexite TEXT CHECK (complexite IN ('Simple','Complexe')),
  responsable TEXT,
  conservation_fonciere TEXT,
  progression TEXT NOT NULL DEFAULT 'Rédaction',
  termine_le TEXT,
  valeur_acte INTEGER NOT NULL DEFAULT 0,
  honoraires_totaux INTEGER NOT NULL DEFAULT 0,
  emoluments INTEGER NOT NULL DEFAULT 0,
  exonere_tva INTEGER NOT NULL DEFAULT 0,
  droits_etat INTEGER NOT NULL DEFAULT 0,
  debours INTEGER NOT NULL DEFAULT 0,
  debours_rembourses INTEGER NOT NULL DEFAULT 0,
  prestations_annexes INTEGER NOT NULL DEFAULT 0,
  autres_depenses INTEGER NOT NULL DEFAULT 0,
  autres_depenses_motif TEXT,
  depenses_formalites INTEGER NOT NULL DEFAULT 0,
  statut_formalites TEXT NOT NULL DEFAULT 'Pas encore débuté'
    CHECK (statut_formalites IN ('Pas encore débuté','Débuté','En cours','Terminé')),
  montant_regle INTEGER NOT NULL DEFAULT 0,
  statut_paiement TEXT NOT NULL DEFAULT 'En attente',
  difficultes TEXT,
  observations TEXT,
  saisi_par TEXT REFERENCES utilisateurs(id),
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT,
  supprime_le TEXT
);
CREATE INDEX IF NOT EXISTS idx_actes_etude ON actes(etude_id);

CREATE TABLE IF NOT EXISTS acte_parties (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  acte_id TEXT NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 1,
  nom_partie TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pieces_log (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  acte_id TEXT NOT NULL REFERENCES actes(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  auteur TEXT REFERENCES utilisateurs(id),
  horodatage TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etude_id TEXT NOT NULL,
  table_cible TEXT NOT NULL,
  ligne_id TEXT,
  action TEXT NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  utilisateur TEXT,
  horodatage TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  type_export TEXT NOT NULL DEFAULT 'a_la_demande',
  perimetre TEXT,
  demande_par TEXT REFERENCES utilisateurs(id),
  confirme_le TEXT,
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referentiels (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id) ON DELETE CASCADE,
  type_liste TEXT NOT NULL,
  valeur TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_ref_etude ON referentiels(etude_id, type_liste, ordre);

CREATE TABLE IF NOT EXISTS parametres_etude (
  etude_id TEXT PRIMARY KEY REFERENCES etudes(id) ON DELETE CASCADE,
  conservation_annees INTEGER NOT NULL DEFAULT 10,
  session_minutes INTEGER NOT NULL DEFAULT 30,
  acte_simple_s1 INTEGER NOT NULL DEFAULT 20,
  acte_simple_s2 INTEGER NOT NULL DEFAULT 40,
  acte_simple_s3 INTEGER NOT NULL DEFAULT 60,
  acte_complexe_s1 INTEGER NOT NULL DEFAULT 30,
  acte_complexe_s2 INTEGER NOT NULL DEFAULT 60,
  acte_complexe_s3 INTEGER NOT NULL DEFAULT 90,
  succession_s1 INTEGER NOT NULL DEFAULT 180,
  succession_s2 INTEGER NOT NULL DEFAULT 270,
  succession_s3 INTEGER NOT NULL DEFAULT 365,
  appel_s1 INTEGER NOT NULL DEFAULT 3,
  appel_s2 INTEGER NOT NULL DEFAULT 5,
  appel_s3 INTEGER NOT NULL DEFAULT 10,
  couleur_n1 TEXT NOT NULL DEFAULT '#FFF4C2',
  couleur_n2 TEXT NOT NULL DEFAULT '#FFD9A0',
  couleur_n3 TEXT NOT NULL DEFAULT '#FF9E9E',
  couleur_ok TEXT NOT NULL DEFAULT '#E9F7EC',
  taux_tva REAL NOT NULL DEFAULT 0.18 CHECK (taux_tva >= 0 AND taux_tva <= 1),
  maj_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS avis (
  id TEXT PRIMARY KEY,
  fonction TEXT,
  categorie TEXT NOT NULL DEFAULT 'Amélioration'
    CHECK (categorie IN ('Amélioration','Difficulté rencontrée','Erreur / bug','Autre')),
  message TEXT NOT NULL,
  recu_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demandes_recuperation (
  id TEXT PRIMARY KEY,
  etude_id TEXT NOT NULL REFERENCES etudes(id),
  identifiant TEXT NOT NULL,
  demande_le TEXT NOT NULL DEFAULT (datetime('now')),
  code_confirmation TEXT NOT NULL,
  traite_le TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente'
);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  etude_id TEXT,
  utilisateur TEXT,
  type_evenement TEXT NOT NULL,
  severite TEXT NOT NULL DEFAULT 'info',
  details TEXT,
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_security_events_etude ON security_events(etude_id, cree_le);

CREATE TABLE IF NOT EXISTS saas_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prix_mensuel INTEGER NOT NULL DEFAULT 0,
  prix_annuel INTEGER NOT NULL DEFAULT 0,
  max_utilisateurs INTEGER NOT NULL DEFAULT 10,
  max_stockage_go INTEGER NOT NULL DEFAULT 10,
  actif INTEGER NOT NULL DEFAULT 1,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saas_tenants (
  id TEXT PRIMARY KEY,
  etude_id TEXT UNIQUE REFERENCES etudes(id) ON DELETE CASCADE,
  nom_tenant TEXT NOT NULL,
  contact_nom TEXT,
  contact_email TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES saas_plans(id),
  date_debut TEXT NOT NULL DEFAULT (date('now')),
  date_fin TEXT,
  periodicite TEXT NOT NULL DEFAULT 'mensuel',
  statut TEXT NOT NULL DEFAULT 'active',
  montant INTEGER NOT NULL DEFAULT 0,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saas_licenses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  cle_licence TEXT NOT NULL UNIQUE,
  quota_utilisateurs INTEGER NOT NULL DEFAULT 10,
  quota_stockage_go INTEGER NOT NULL DEFAULT 10,
  expire_le TEXT,
  statut TEXT NOT NULL DEFAULT 'active',
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saas_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES saas_subscriptions(id) ON DELETE SET NULL,
  reference TEXT NOT NULL UNIQUE,
  montant INTEGER NOT NULL DEFAULT 0,
  devise TEXT NOT NULL DEFAULT 'XOF',
  statut TEXT NOT NULL DEFAULT 'en_attente',
  emission_le TEXT NOT NULL DEFAULT (date('now')),
  echeance_le TEXT,
  payee_le TEXT,
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saas_support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES saas_tenants(id) ON DELETE SET NULL,
  sujet TEXT NOT NULL,
  description TEXT NOT NULL,
  priorite TEXT NOT NULL DEFAULT 'normale',
  statut TEXT NOT NULL DEFAULT 'ouvert',
  cree_par TEXT REFERENCES utilisateurs(id),
  assigne_a TEXT REFERENCES utilisateurs(id),
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saas_notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES saas_tenants(id) ON DELETE CASCADE,
  canal TEXT NOT NULL DEFAULT 'in_app',
  cible TEXT,
  sujet TEXT,
  message TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'queued',
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  envoye_le TEXT
);

CREATE TABLE IF NOT EXISTS saas_global_settings (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  modifie_le TEXT NOT NULL DEFAULT (datetime('now')),
  modifie_par TEXT REFERENCES utilisateurs(id)
);
