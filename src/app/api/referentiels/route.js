import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { estRedacteur } from "@/lib/acces";
import { withTenant } from "@/lib/db";

export async function GET() {
  try {
    const s = await exigerSession();
    const listes = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT type_liste, valeur FROM referentiels WHERE etude_id = $1 AND actif = true ORDER BY type_liste, ordre`,
        [s.etudeId]);
      const out = {};
      for (const r of rows) (out[r.type_liste] ||= []).push(r.valeur);

      const { rows: gens } = await c.query(
        `SELECT nom_affiche, fonction FROM utilisateurs
         WHERE etude_id = $1 AND actif = true ORDER BY nom_affiche`,
        [s.etudeId]);
      out.responsables_actes = gens.filter((u) => estRedacteur(u.fonction)).map((u) => u.nom_affiche);
      out.responsables_appels = gens.map((u) => u.nom_affiche);
      return out;
    });
    return NextResponse.json(listes);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
