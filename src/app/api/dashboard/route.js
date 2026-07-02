import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { sqlDashboard } from "@/lib/dialect";

export async function GET() {
  try {
    const s = exigerSession();
    const q = sqlDashboard();
    const stats = await withTenant(s.etudeId, async (c) => {
      const appels = (await c.query(q.appels, [s.etudeId])).rows[0];
      const actes = (await c.query(q.actes, [s.etudeId])).rows[0];
      const parConservation = (await c.query(q.parConservation, [s.etudeId])).rows;
      const comparatif = (await c.query(q.comparatif, [s.etudeId])).rows;
      return { appels, actes, parConservation, comparatif };
    });
    return NextResponse.json(stats);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
