import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { estRedacteur } from "@/lib/acces";

export async function GET() {
  try {
    const s = await exigerSession();
    const listes = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT type_liste, valeur FROM referentiels WHERE actif = true ORDER BY type_liste, ordre`);
      const out = {};
      for (const r of rows) (out[r.type_liste] ||= []).push(r.valeur);

      // N°25 — Le menu « Responsable » ne doit JAMAIS être vide : il se remplit avec les
      // comptes actifs de l'étude, mis à jour dès qu'un compte est créé ou modifié.
      // Le Super Administrateur (Anthropic/éditeur) n'est PAS un collaborateur de l'étude :
      // aucun client ne demande à lui parler. Il n'apparaît dans aucun menu.
      const { rows: gens } = await c.query(
        `SELECT nom_affiche, fonction FROM utilisateurs
         WHERE actif = true AND role <> 'super_admin' ORDER BY nom_affiche`);
      // Responsables d'un ACTE : uniquement ceux qui rédigent (Notaires, Clercs).
      out.responsables_actes = gens.filter((u) => estRedacteur(u.fonction)).map((u) => u.nom_affiche);
      // Destinataires d'un APPEL / COURRIER : tous les collaborateurs.
      out.responsables_appels = gens.map((u) => u.nom_affiche);
      return out;
    });
    return NextResponse.json(listes);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
