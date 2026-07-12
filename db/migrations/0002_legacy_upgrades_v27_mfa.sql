-- Migration historique "V27" + colonnes MFA/présence sur utilisateurs.
-- Sur une base fraîche, 0001_baseline_schema.sql déclare déjà ces colonnes/tables
-- directement dans les CREATE TABLE : cette migration n'y fait donc rien (tous les
-- ALTER sont IF NOT EXISTS). Elle existe pour les bases plus anciennes créées avant
-- que 0001 ne les inclue nativement (c'était son rôle avant le passage aux
-- migrations versionnées : replays successifs de scripts/migrate.js).

ALTER TABLE actes ADD COLUMN IF NOT EXISTS emoluments BIGINT NOT NULL DEFAULT 0;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS exonere_tva BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS droits_etat BIGINT NOT NULL DEFAULT 0;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS debours BIGINT NOT NULL DEFAULT 0;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS debours_rembourses BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS prestations_annexes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS autres_depenses BIGINT NOT NULL DEFAULT 0;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS autres_depenses_motif VARCHAR;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS depenses_formalites BIGINT NOT NULL DEFAULT 0;
ALTER TABLE actes ADD COLUMN IF NOT EXISTS statut_formalites VARCHAR NOT NULL DEFAULT 'Pas encore débuté';

ALTER TABLE parametres_etude ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5,4) NOT NULL DEFAULT 0.18;

CREATE TABLE IF NOT EXISTS avis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonction VARCHAR,
  categorie VARCHAR NOT NULL DEFAULT 'Amélioration',
  message TEXT NOT NULL,
  recu_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION compte_etat(p_uid UUID)
  RETURNS TABLE (ok BOOLEAN, niveau_acces VARCHAR, fonction VARCHAR)
  LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT (u.actif AND (u.role = 'super_admin' OR e.statut = 'active')
            AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= now())) AS ok,
           u.niveau_acces, u.fonction
    FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
    WHERE u.id = p_uid;
  $$;

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_activite TIMESTAMPTZ;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS nom_complet VARCHAR;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS niveau_acces VARCHAR NOT NULL DEFAULT 'standard';
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(20) NOT NULL DEFAULT 'totp';
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT;

UPDATE utilisateurs SET niveau_acces = 'administrateur' WHERE identifiant = 'notaire' AND niveau_acces = 'standard';
