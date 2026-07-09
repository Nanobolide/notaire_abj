import { withApiGuard } from "@/lib/api-guard";
import { voitFinancier, voitTableauActes, voitTableauAppels } from "@/lib/acces";
import { withTenant } from "@/lib/db";
import { dashboardQueries, isPg, now, actifClause } from "@/lib/dialect";

export async function GET() {
  return withApiGuard({
    run: async (s) => {
    const q = dashboardQueries();
    const stats = await withTenant(s.etudeId, async (c) => {
      const run = async (sql) => (await c.query(sql, [s.etudeId])).rows;
      const actes = voitTableauActes(s) ? (await c.query(q.actes, [s.etudeId])).rows[0] : null;
      const finances = voitFinancier(s) ? (await c.query(q.finances, [s.etudeId])).rows[0] : null;
      const appels = voitTableauAppels(s) ? (await c.query(q.appels, [s.etudeId])).rows[0] : null;

      let presence = null;
      if (voitTableauActes(s)) {
        const enLigne = isPg()
          ? `(derniere_activite IS NOT NULL AND derniere_activite > ${now()} - interval '5 minutes')`
          : `(derniere_activite IS NOT NULL AND derniere_activite > datetime('now', '-5 minutes'))`;
        presence = (await c.query(
          `SELECT nom_affiche, fonction, role, derniere_activite, ${enLigne} AS en_ligne
           FROM utilisateurs WHERE etude_id = $1 AND ${actifClause("")} ORDER BY en_ligne DESC, role, nom_affiche`,
          [s.etudeId]
        )).rows;
      }

      return {
        actes,
        finances,
        parConservation: await run(q.parConservation),
        parEtape: await run(q.parEtape),
        parResponsable: await run(q.parResponsable),
        appels,
        parFlux: await run(q.parFlux),
        parMotif: await run(q.parMotif),
        parCollaborateur: await run(q.parCollaborateur),
        presence,
      };
    });
      return stats;
    },
  });
}
