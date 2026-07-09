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
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (etude_id, identifiant)
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
  maj_le TEXT NOT NULL DEFAULT (datetime('now'))
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
