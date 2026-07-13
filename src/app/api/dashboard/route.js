import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { voitFinancier, voitTableauActes, voitTableauAppels } from "@/lib/acces";
import { withTenant } from "@/lib/db";

// "En cours" = une étape est choisie, ni Terminé ni Annulé (colonne fusionnée)
const EN_COURS = `progression NOT IN ('Terminé','Annulé')`;

export async function GET() {
  try {
    const s = await exigerSession();
    const stats = await withTenant(s.etudeId, async (c) => {
      const q = async (sql) => (await c.query(sql)).rows;

      // ---- ① ACTES : compteurs gradués ----
      const actes = (await c.query(`
        SELECT count(*) AS total,
               count(*) FILTER (WHERE ${EN_COURS}) AS en_cours,
               count(*) FILTER (WHERE progression = 'Terminé') AS termines,
               count(*) FILTER (WHERE progression = 'Annulé') AS annules,
               count(*) FILTER (WHERE ${EN_COURS} AND date_echeance < CURRENT_DATE) AS echeances_depassees,
               count(*) FILTER (WHERE ${EN_COURS} AND CURRENT_DATE - date_ouverture >
                 (CASE WHEN nature_acte = 'Succession' THEN 365
                       WHEN complexite = 'Simple' THEN 60 ELSE 90 END)) AS critiques
        FROM actes WHERE supprime_le IS NULL`)).rows[0];

      // ---- Suivi financier (tous dossiers confondus + zoom en cours) ----
      const finances = (await c.query(`
        SELECT COALESCE(sum(honoraires_totaux),0) AS total_facture,
               COALESCE(sum(emoluments),0) AS emoluments,
               count(*) FILTER (WHERE (emoluments + droits_etat + debours + autres_depenses) = 0)::int
                 AS dossiers_a_ventiler,
               COALESCE(sum(montant_regle),0) AS honoraires_regles,
               COALESCE(sum(honoraires_totaux - montant_regle),0) AS reste_a_payer,
               COALESCE(sum(valeur_acte),0) AS valeur_totale,
               COALESCE(sum(honoraires_totaux) FILTER (WHERE ${EN_COURS}),0) AS zoom_honoraires_en_cours,
               COALESCE(sum(valeur_acte) FILTER (WHERE ${EN_COURS}),0) AS zoom_valeur_en_cours
        FROM actes WHERE supprime_le IS NULL`)).rows[0];

      // ---- Analyse par Conservation Foncière ----
      const parConservation = await q(`
        SELECT conservation_fonciere,
               count(*) AS dossiers,
               count(*) FILTER (WHERE ${EN_COURS}) AS en_cours,
               count(*) FILTER (WHERE progression = 'Terminé') AS termines,
               count(*) FILTER (WHERE ${EN_COURS} AND date_echeance < CURRENT_DATE) AS depassees
        FROM actes WHERE supprime_le IS NULL AND conservation_fonciere IS NOT NULL
        GROUP BY conservation_fonciere ORDER BY conservation_fonciere`);

      // ---- Répartition par étape (dossiers en cours) ----
      const parEtape = await q(`
        SELECT progression AS etape, count(*) AS dossiers
        FROM actes WHERE supprime_le IS NULL AND ${EN_COURS}
        GROUP BY progression ORDER BY count(*) DESC`);

      // ---- Répartition par responsable ----
      const parResponsable = await q(`
        SELECT responsable,
               count(*) AS total,
               count(*) FILTER (WHERE progression = 'Terminé') AS termines,
               count(*) FILTER (WHERE ${EN_COURS}) AS en_cours,
               count(*) FILTER (WHERE ${EN_COURS} AND date_echeance < CURRENT_DATE) AS depassees
        FROM actes WHERE supprime_le IS NULL AND responsable IS NOT NULL
        GROUP BY responsable ORDER BY count(*) DESC`);

      // ---- ② APPELS : compteurs gradués ----
      const appels = (await c.query(`
        SELECT count(*) AS total,
               count(*) FILTER (WHERE statut_traitement = 'Résolu') AS resolus,
               count(*) FILTER (WHERE statut_traitement = 'En cours') AS en_cours,
               count(*) FILTER (WHERE statut_traitement = 'En attente du Clerc') AS en_attente,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu' AND nb_tentatives >= 3) AS tentatives_3plus,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu'
                 AND CURRENT_DATE - date_entree > 5) AS urgents
        FROM appels_courriers WHERE supprime_le IS NULL`)).rows[0];

      const parFlux = await q(`
        SELECT type_flux, count(*) AS nombre FROM appels_courriers
        WHERE supprime_le IS NULL GROUP BY type_flux ORDER BY count(*) DESC`);

      const parMotif = await q(`
        SELECT motif, count(*) AS nombre FROM appels_courriers
        WHERE supprime_le IS NULL AND motif IS NOT NULL GROUP BY motif ORDER BY count(*) DESC`);

      const parCollaborateur = await q(`
        SELECT destinataire,
               count(*) AS total,
               count(*) FILTER (WHERE statut_traitement = 'Résolu') AS resolus,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu') AS non_resolus,
               count(*) FILTER (WHERE statut_traitement <> 'Résolu'
                 AND CURRENT_DATE - date_entree > 5) AS urgents
        FROM appels_courriers WHERE supprime_le IS NULL AND destinataire IS NOT NULL
        GROUP BY destinataire ORDER BY count(*) DESC`);

      // Présence (Notaire uniquement) : connecté = actif il y a moins de 5 minutes
      let presence = null;
      if (voitTableauActes(s)) {   // présence : Notaires seulement
        presence = (await c.query(
          `SELECT nom_affiche, fonction, role, derniere_activite,
                  (derniere_activite IS NOT NULL AND derniere_activite > now() - interval '5 minutes') AS en_ligne
           FROM utilisateurs WHERE actif = true ORDER BY en_ligne DESC, role, nom_affiche`)).rows;
      }
      return { actes: voitTableauActes(s) ? actes : null,
               finances: voitFinancier(s) ? finances : null, parConservation, parEtape,
               parResponsable,
               appels: voitTableauAppels(s) ? appels : null,
               parFlux, parMotif, parCollaborateur, presence };
    });
    return NextResponse.json(stats);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
