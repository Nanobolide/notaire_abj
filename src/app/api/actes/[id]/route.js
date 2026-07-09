import { NextResponse } from "next/server";
import { exigerSession, exigerNotaire } from "@/lib/auth";
import { filtrerActe, voitMontants, saisitDepenses } from "@/lib/acces";
import { withTenant, audit, newId } from "@/lib/db";
import { now, isPg, sqlPartiesInsert } from "@/lib/dialect";

const CHAMPS = ["numero_minute","numero_dossier","date_ouverture","date_echeance","nature_acte",
  "complexite","responsable","conservation_fonciere","progression","valeur_acte",
  "honoraires_totaux","montant_regle","statut_paiement","difficultes","observations"];

export async function PATCH(req, { params }) {
  let s3 = null;
  try {
    const s = await exigerSession(); s3 = s;
    const d = await req.json();
    // C10 — champs financiers modifiables par le Notaire et le Comptable seulement.
    if (!voitMontants(s))
      for (const ch of ["valeur_acte","honoraires_totaux","montant_regle","statut_paiement",
                        "emoluments","exonere_tva","droits_etat","debours","debours_rembourses",
                        "prestations_annexes"]) delete d[ch];
    // Les dépenses de formalités : le Formaliste saisit les siennes, les autres non.
    if (!saisitDepenses(s)) delete d.depenses_formalites;
    // Le statut des formalités : Formaliste, Notaire, Comptable.
    if (!saisitDepenses(s)) delete d.statut_formalites;
    const ligne = await withTenant(s.etudeId, async (c) => {
      const { rows: avantRows } = await c.query(
        `SELECT * FROM actes WHERE id = $1 AND supprime_le IS NULL`, [params.id]);
      if (!avantRows[0]) { const e = new Error("Acte introuvable"); e.status = 404; throw e; }
      const sets = []; const vals = [];
      for (const ch of CHAMPS) if (ch in d) { vals.push(d[ch]); sets.push(`${ch} = $${vals.length}`); }
      // Terminé / Annulé : horodatage figeant le délai
      if (d.progression === "Terminé" || d.progression === "Annulé")
        sets.push(`termine_le = COALESCE(termine_le, ${now()})`);
      if (d.progression && d.progression !== "Terminé" && d.progression !== "Annulé")
        sets.push("termine_le = NULL");
      sets.push(`modifie_le = ${now()}`);
      vals.push(params.id);
      const { rows } = await c.query(
        `UPDATE actes SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals);
      // Garde-fous financiers après fusion des champs (I4)
      if (Number(rows[0].montant_regle) > Number(rows[0].honoraires_totaux)) {
        const e = new Error("Le montant réglé ne peut pas dépasser les honoraires totaux."); e.status = 400; throw e;
      }
      // Mise à jour des parties si fournies (N4)
      if (Array.isArray(d.parties)) {
        await c.query(`DELETE FROM acte_parties WHERE acte_id = $1`, [params.id]);
        const parties = d.parties.filter((p) => p && p.trim());
        for (let i = 0; i < parties.length; i++) {
          const pParams = isPg()
            ? [s.etudeId, params.id, i + 1, parties[i].trim()]
            : [newId(), s.etudeId, params.id, i + 1, parties[i].trim()];
          await c.query(sqlPartiesInsert(), pParams);
        }
      }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: params.id,
        action: "modification", avant: avantRows[0], apres: rows[0], utilisateur: s.uid });
      return rows[0];
    });
    return NextResponse.json(filtrerActe(ligne, s3));
  } catch (e) {
    if (e.code === "23505")
      return NextResponse.json({ erreur: "Ce N° de minute existe déjà dans le registre." }, { status: 409 });
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}

/** Suppression logique (corbeille 30 jours) — Administrateur d'étude uniquement. */
export async function DELETE(req, { params }) {
  try {
    const s = await exigerNotaire();
    await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `UPDATE actes SET supprime_le = ${now()} WHERE id = $1 AND supprime_le IS NULL RETURNING *`, [params.id]);
      if (!rows[0]) { const e = new Error("Acte introuvable"); e.status = 404; throw e; }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: params.id,
        action: "suppression", avant: rows[0], utilisateur: s.uid });
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
