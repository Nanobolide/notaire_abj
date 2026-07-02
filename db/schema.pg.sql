-- NOTARIA — Schéma PostgreSQL (production Render)

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
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (etude_id, identifiant)
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

CREATE OR REPLACE FUNCTION prochain_numero_appel(p_etude UUID) RETURNS INT AS $$
  SELECT COALESCE(MAX(numero), 0) + 1 FROM appels_courriers
  WHERE etude_id = p_etude AND annee = EXTRACT(YEAR FROM now());
$$ LANGUAGE sql;
