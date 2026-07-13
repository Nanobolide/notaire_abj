import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { voitFinancier } from "@/lib/acces";
import { withTenant } from "@/lib/db";

/**
 * Tableau de bord COMPTABILITÉ — réservé au Comptable et aux Notaires.
 * Rappel de la règle métier : seuls les ÉMOLUMENTS sont un revenu de l'étude.
 * Les droits d'État transitent vers le Trésor ; les débours sont des avances.
 * Total facturé au client = émoluments + droits d'État + débours + prestations annexes + autres dépenses.
 */
export async function GET() {
  try {
    const s = await exigerSession();
    if (!voitFinancier(s))
      return NextResponse.json({ erreur: "Réservé au Notaire et au Comptable." }, { status: 403 });

    const data = await withTenant(s.etudeId, async (c) => {

      // P2.1 — Le TOTAL DES FRAIS est ce que le client paie : saisi par le clerc (honoraires_totaux).
      // Le comptable le VENTILE ensuite en Droits d'État + Débours + Émoluments. La ventilation
      // répartit le total, elle ne le recrée pas. Un dossier est « ventilé » dès qu'un poste est saisi.
      const TOTAL = `honoraires_totaux`;
      const VENTILE = `(emoluments + droits_etat + debours + autres_depenses)`;
      const EST_VENTILE = `(${VENTILE} > 0)`;
      const P = [];

      // A · Rentabilité réelle de l'étude
      const { rows: [g] } = await c.query(`
        SELECT COALESCE(SUM(emoluments),0)::bigint            AS emoluments,
               COALESCE(SUM(droits_etat),0)::bigint           AS droits_etat,
               COALESCE(SUM(debours),0)::bigint               AS debours,
               COALESCE(SUM(autres_depenses),0)::bigint       AS autres_depenses,
               COALESCE(SUM(depenses_formalites),0)::bigint   AS depenses_formalites,
               COALESCE(SUM(${TOTAL}),0)::bigint              AS total_facture,
               COALESCE(SUM(${VENTILE}),0)::bigint            AS total_ventile,
               COALESCE(SUM(montant_regle),0)::bigint         AS encaisse,
               COALESCE(SUM(${TOTAL}) - SUM(montant_regle),0)::bigint AS reste_a_recouvrer,
               count(*) FILTER (WHERE NOT ${EST_VENTILE})::int AS dossiers_a_ventiler,
               COALESCE(SUM(debours),0)::bigint               AS debours_total
        FROM actes WHERE supprime_le IS NULL AND progression <> 'Annulé'`, P);

      // B · Rentabilité PAR CATÉGORIE D'ACTE (n°14)
      const { rows: parNature } = await c.query(`
        SELECT nature_acte,
               count(*)::int                          AS dossiers,
               COALESCE(SUM(emoluments),0)::bigint    AS emoluments,
               COALESCE(SUM(droits_etat),0)::bigint   AS droits_etat,
               COALESCE(SUM(debours + depenses_formalites + autres_depenses),0)::bigint AS depenses,
               COALESCE(SUM(${TOTAL}),0)::bigint      AS total_facture,
               COALESCE(SUM(montant_regle),0)::bigint AS encaisse,
               COALESCE(SUM(${TOTAL}) - SUM(montant_regle),0)::bigint AS reste
        FROM actes WHERE supprime_le IS NULL AND progression <> 'Annulé'
        GROUP BY nature_acte ORDER BY emoluments DESC`, P);

      // C · Rentabilité PAR COLLABORATEUR (n°15)
      const { rows: parCollaborateur } = await c.query(`
        SELECT COALESCE(responsable,'(non attribué)') AS responsable,
               count(*)::int                          AS dossiers,
               count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé'))::int AS en_cours,
               COALESCE(SUM(emoluments),0)::bigint    AS emoluments,
               COALESCE(SUM(debours),0)::bigint       AS debours,
               COALESCE(SUM(montant_regle),0)::bigint AS encaisse,
               COALESCE(SUM(${TOTAL}) - SUM(montant_regle),0)::bigint AS reste
        FROM actes WHERE supprime_le IS NULL AND progression <> 'Annulé'
        GROUP BY responsable ORDER BY emoluments DESC`, P);

      // D · BALANCE DES TIERS — une ligne par CLIENT (n°17, corrigé C18).
      // Le client facturé est la PREMIÈRE partie de l'acte (ordre = 1) : c'est elle qui règle.
      // Un client ayant trois dossiers apparaît UNE fois, avec le total de ce qu'il doit.
      const { rows: balance } = await c.query(`
        SELECT p.nom_partie                             AS client,
               count(DISTINCT a.id)::int                AS dossiers,
               COALESCE(SUM(${TOTAL}),0)::bigint        AS facture,
               COALESCE(SUM(a.montant_regle),0)::bigint AS encaisse,
               COALESCE(SUM(${TOTAL}) - SUM(a.montant_regle),0)::bigint AS solde
        FROM actes a
        JOIN acte_parties p ON p.acte_id = a.id AND p.ordre = 1
        WHERE a.supprime_le IS NULL AND a.progression <> 'Annulé'
        GROUP BY p.nom_partie
        HAVING COALESCE(SUM(${TOTAL}) - SUM(a.montant_regle),0) <> 0
        ORDER BY solde DESC LIMIT 30`, P);

      // E · Trésorerie des formalités
      const { rows: [f] } = await c.query(`
        SELECT COALESCE(SUM(depenses_formalites),0)::bigint AS depense,
               COALESCE(SUM(debours),0)::bigint AS debours,
               count(*) FILTER (WHERE droits_etat > 0 AND montant_regle < droits_etat)::int AS dossiers_droits_impayes
        FROM actes WHERE supprime_le IS NULL AND progression <> 'Annulé'`);

      return { global: g, parNature, parCollaborateur, balance, formalites: f };
    });
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
