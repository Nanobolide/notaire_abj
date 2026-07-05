import { NextResponse } from "next/server";
import { exigerSession, exigerAdmin, estAdmin } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { now } from "@/lib/dialect";

const CHAMPS = ["numero_minute","numero_dossier","date_ouverture","date_echeance","nature_acte",
  "complexite","responsable","conservation_fonciere","progression","valeur_acte",
  "honoraires_totaux","montant_regle","statut_paiement","difficultes","observations"];

export async function PATCH(req, { params }) {
  try {
    const s = exigerSession();
    const d = await req.json();
    if (!estAdmin(s))
      for (const ch of ["valeur_acte","honoraires_totaux","montant_regle","statut_paiement"]) delete d[ch];
    const ligne = await withTenant(s.etudeId, async (c) => {
      const { rows: avantRows } = await c.query(
        `SELECT * FROM actes WHERE id = $1 AND etude_id = $2 AND supprime_le IS NULL`,
        [params.id, s.etudeId]
      );
      if (!avantRows[0]) { const e = new Error("Acte introuvable"); e.status = 404; throw e; }
      const sets = [];
      const vals = [];
      for (const ch of CHAMPS) if (ch in d) { vals.push(d[ch]); sets.push(`${ch} = $${vals.length}`); }
      if (d.progression === "Terminé" || d.progression === "Annulé")
        sets.push(`termine_le = COALESCE(termine_le, ${now()})`);
      if (d.progression && d.progression !== "Terminé" && d.progression !== "Annulé")
        sets.push("termine_le = NULL");
      sets.push(`modifie_le = ${now()}`);
      vals.push(params.id, s.etudeId);
      const { rows } = await c.query(
        `UPDATE actes SET ${sets.join(", ")}
         WHERE id = $${vals.length - 1} AND etude_id = $${vals.length} RETURNING *`, vals
      );
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: params.id,
        action: "modification", avant: avantRows[0], apres: rows[0], utilisateur: s.uid });
      return rows[0];
    });
    return NextResponse.json(ligne);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function DELETE(req, { params }) {
  try {
    const s = exigerAdmin();
    await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `UPDATE actes SET supprime_le = ${now()}
         WHERE id = $1 AND etude_id = $2 AND supprime_le IS NULL RETURNING *`,
        [params.id, s.etudeId]
      );
      if (!rows[0]) { const e = new Error("Acte introuvable"); e.status = 404; throw e; }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: params.id,
        action: "suppression", avant: rows[0], utilisateur: s.uid });
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
