import { NextResponse } from "next/server";
import { exigerSession, estAdmin } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { dashboardQueries } from "@/lib/dialect";

export async function GET() {
  try {
    const s = exigerSession();
    const q = dashboardQueries();
    const stats = await withTenant(s.etudeId, async (c) => {
      const run = async (sql) => (await c.query(sql, [s.etudeId])).rows;
      const actes = (await c.query(q.actes, [s.etudeId])).rows[0];
      const finances = estAdmin(s) ? (await c.query(q.finances, [s.etudeId])).rows[0] : null;
      const appels = (await c.query(q.appels, [s.etudeId])).rows[0];
      return {
        actes, finances,
        parConservation: await run(q.parConservation),
        parEtape: await run(q.parEtape),
        parResponsable: await run(q.parResponsable),
        appels,
        parFlux: await run(q.parFlux),
        parMotif: await run(q.parMotif),
        parCollaborateur: await run(q.parCollaborateur),
      };
    });
    return NextResponse.json(stats);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
