import { NextResponse } from "next/server";
import { exigerSession, estAdmin } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { dashboardQueries, isPg, now } from "@/lib/dialect";

export async function GET() {
  try {
    const s = await exigerSession();
    const q = dashboardQueries();
    const stats = await withTenant(s.etudeId, async (c) => {
      const run = async (sql) => (await c.query(sql, [s.etudeId])).rows;
      const actes = (await c.query(q.actes, [s.etudeId])).rows[0];
      const finances = estAdmin(s) ? (await c.query(q.finances, [s.etudeId])).rows[0] : null;
      const appels = (await c.query(q.appels, [s.etudeId])).rows[0];

      let presence = null;
      if (estAdmin(s)) {
        const enLigne = isPg()
          ? `(derniere_activite IS NOT NULL AND derniere_activite > ${now()} - interval '5 minutes')`
          : `(derniere_activite IS NOT NULL AND derniere_activite > datetime('now', '-5 minutes'))`;
        presence = (await c.query(
          `SELECT nom_affiche, fonction, role, derniere_activite, ${enLigne} AS en_ligne
           FROM utilisateurs WHERE etude_id = $1 AND ${isPg() ? "actif = true" : "actif = 1"} ORDER BY en_ligne DESC, role, nom_affiche`,
          [s.etudeId]
        )).rows;
      }

      return {
        actes, finances,
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
    return NextResponse.json(stats);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
