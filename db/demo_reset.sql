-- Effacer TOUTES les données de démonstration de l'étude pilote (registres remis à zéro)
DELETE FROM pieces_log        WHERE etude_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM acte_parties      WHERE etude_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM actes             WHERE etude_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM appels_courriers  WHERE etude_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM audit_log         WHERE etude_id = '11111111-1111-1111-1111-111111111111';
