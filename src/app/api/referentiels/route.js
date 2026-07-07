import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db";

export async function GET() {
  try {
    const s = await exigerSession();
    const listes = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT type_liste, valeur FROM referentiels WHERE actif = true ORDER BY type_liste, ordre`);
      const out = {};
      for (const r of rows) (out[r.type_liste] ||= []).push(r.valeur);
      return out;
    });
    return NextResponse.json(listes);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
