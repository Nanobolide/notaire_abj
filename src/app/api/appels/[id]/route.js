import { NextResponse } from "next/server";
import { exigerSession, exigerNotaire } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { now } from "@/lib/dialect";

const CHAMPS = ["type_flux","date_entree","heure","reference_dossier","client_nom","telephone","email",
  "destinataire","mis_en_relation","motif","statut_traitement","nb_tentatives","observations"];

export async function PATCH(req, { params }) {
  try {
    const s = await exigerSession();
    const d = await req.json();
    const ligne = await withTenant(s.etudeId, async (c) => {
      const { rows: avantRows } = await c.query(
        `SELECT * FROM appels_courriers WHERE id = $1 AND supprime_le IS NULL`, [params.id]);
      if (!avantRows[0]) { const e = new Error("Entrée introuvable"); e.status = 404; throw e; }
      const sets = []; const vals = [];
      for (const ch of CHAMPS) if (ch in d) { vals.push(d[ch]); sets.push(`${ch} = $${vals.length}`); }
      // Passage à Résolu : horodatage figeant les jours écoulés (une seule fois)
      if (d.statut_traitement === "Résolu") sets.push(`resolu_le = COALESCE(resolu_le, ${now()})`);
      if (d.statut_traitement && d.statut_traitement !== "Résolu") sets.push("resolu_le = NULL");
      sets.push(`modifie_le = ${now()}`);
      vals.push(params.id);
      const { rows } = await c.query(
        `UPDATE appels_courriers SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals);
      await audit(c, { etudeId: s.etudeId, table: "appels_courriers", ligneId: params.id,
        action: "modification", avant: avantRows[0], apres: rows[0], utilisateur: s.uid });
      return rows[0];
    });
    return NextResponse.json(ligne);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Suppression logique (corbeille 30 jours) — Administrateur d'étude uniquement. */
export async function DELETE(req, { params }) {
  try {
    const s = await exigerNotaire();
    await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `UPDATE appels_courriers SET supprime_le = ${now()} WHERE id = $1 AND supprime_le IS NULL RETURNING *`,
        [params.id]);
      if (!rows[0]) { const e = new Error("Entrée introuvable"); e.status = 404; throw e; }
      await audit(c, { etudeId: s.etudeId, table: "appels_courriers", ligneId: params.id,
        action: "suppression", avant: rows[0], utilisateur: s.uid });
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
