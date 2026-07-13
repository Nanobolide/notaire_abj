import { NextResponse } from "next/server";
import { exigerNotaire } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";

const TABLES = { acte: "actes", appel: "appels_courriers" };

/** Contenu de la corbeille (30 jours) — Notaire uniquement. */
export async function GET() {
  try {
    const s = await exigerNotaire();
    const data = await withTenant(s.etudeId, async (c) => {
      await c.query(`SELECT purger_corbeille_expiree($1)`, [s.etudeId]); // I6
      const actes = (await c.query(
        `SELECT id, numero_minute AS reference, nature_acte AS detail, supprime_le,
                GREATEST(0, 30 - (CURRENT_DATE - supprime_le::date)) AS jours_restants
         FROM actes WHERE supprime_le IS NOT NULL ORDER BY supprime_le DESC`)).rows;
      const appels = (await c.query(
        `SELECT id, annee || '-' || numero AS reference, client_nom AS detail, supprime_le,
                GREATEST(0, 30 - (CURRENT_DATE - supprime_le::date)) AS jours_restants
         FROM appels_courriers WHERE supprime_le IS NOT NULL ORDER BY supprime_le DESC`)).rows;
      return { actes, appels };
    });
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Restauration ({type:'acte'|'appel', id}) ou suppression définitive ({..., definitif:true}). */
export async function POST(req) {
  try {
    const s = await exigerNotaire();
    const { type, id, definitif } = await req.json();
    const table = TABLES[type];
    if (!table || !id) return NextResponse.json({ erreur: "Type ou identifiant manquant." }, { status: 400 });
    await withTenant(s.etudeId, async (c) => {
      if (definitif) {
        const r = await c.query(`DELETE FROM ${table} WHERE id = $1 AND supprime_le IS NOT NULL RETURNING id`, [id]);
        if (!r.rows[0]) { const e = new Error("Élément introuvable dans la corbeille."); e.status = 404; throw e; }
        await audit(c, { etudeId: s.etudeId, table, ligneId: id, action: "suppression",
          apres: { evenement: "suppression_definitive" }, utilisateur: s.uid });
      } else {
        const r = await c.query(`UPDATE ${table} SET supprime_le = NULL WHERE id = $1 AND supprime_le IS NOT NULL RETURNING id`, [id]);
        if (!r.rows[0]) { const e = new Error("Élément introuvable dans la corbeille."); e.status = 404; throw e; }
        await audit(c, { etudeId: s.etudeId, table, ligneId: id, action: "restauration", utilisateur: s.uid });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code === "23505")
      return NextResponse.json({ erreur: "Restauration impossible : un élément actif porte déjà ce numéro. Modifiez-le d'abord, puis restaurez." }, { status: 409 });
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
