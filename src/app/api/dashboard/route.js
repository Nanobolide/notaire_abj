import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db";

export async function GET() {
  try {
    const s = exigerSession();
    const stats = await withTenant(s.etudeId, async (c) => {
      const appels = (await c.query(`
        SELECT count(*) FILTER (WHERE date_entree = CURRENT_DATE) AS aujourdhui,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu') AS en_cours,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu'
                 AND type_flux = 'Appel Téléphonique'
                 AND (date_entree + heure) < now() - interval '72 hours') AS alertes_72h,
               count(*) FILTER (WHERE nb_tentatives >= 3 AND statut_traitement <> 'Résolu') AS tentatives_3plus
        FROM appels_courriers WHERE supprime_le IS NULL`)).rows[0];
      const actes = (await c.query(`
        SELECT count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé')) AS en_cours,
               count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé')
                 AND date_echeance < CURRENT_DATE) AS echeances_depassees,
               COALESCE(sum(montant_regle),0) AS encaisse,
               COALESCE(sum(honoraires_totaux - montant_regle),0) AS reste_a_payer,
               COALESCE(sum(valeur_acte),0) AS valeur_totale
        FROM actes WHERE supprime_le IS NULL`)).rows[0];
      // Analyse par Conservation Foncière : zones lentes / bloquées
      const parConservation = (await c.query(`
        SELECT conservation_fonciere,
               count(*) AS dossiers,
               round(avg(COALESCE(termine_le::date, CURRENT_DATE) - date_ouverture)) AS delai_moyen_jours,
               count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé')
                 AND date_echeance < CURRENT_DATE) AS en_depassement
        FROM actes WHERE supprime_le IS NULL AND conservation_fonciere IS NOT NULL
        GROUP BY conservation_fonciere ORDER BY delai_moyen_jours DESC NULLS LAST`)).rows;
      // Comparatif mensuel : mois en cours vs mois précédent
      const comparatif = (await c.query(`
        SELECT to_char(date_trunc('month', date_entree), 'YYYY-MM') AS mois,
               count(*) AS appels,
               count(*) FILTER (WHERE resolu_le IS NOT NULL
                 AND resolu_le - (date_entree + heure) <= interval '72 hours') AS resolus_sous_72h
        FROM appels_courriers WHERE supprime_le IS NULL
        GROUP BY 1 ORDER BY 1 DESC LIMIT 6`)).rows;
      return { appels, actes, parConservation, comparatif };
    });
    return NextResponse.json(stats);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
