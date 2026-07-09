import { NextResponse } from "next/server";
import { exigerSession, exigerNotaire } from "@/lib/auth";
import { filtrerActe, voitMontants, saisitDepenses, modifieFormalites, saisitPrevision, plafondReglement } from "@/lib/acces";
import { withTenant, audit } from "@/lib/db";

const CHAMPS = ["numero_minute","numero_dossier","date_ouverture","date_echeance","nature_acte",
  "complexite","responsable","conservation_fonciere","progression","valeur_acte",
  "honoraires_totaux","montant_regle","statut_paiement",
  "emoluments","exonere_tva","droits_etat","debours","debours_rembourses",
  "prestations_annexes","autres_depenses","autres_depenses_motif",
  "depenses_formalites","statut_formalites",
  "difficultes","observations"];

export async function PATCH(req, { params }) {
  let s3 = null;
  try {
    const s = await exigerSession(); s3 = s;
    const d = await req.json();
    if (!saisitPrevision(s))
      for (const ch of ["valeur_acte","honoraires_totaux","montant_regle","statut_paiement"]) delete d[ch];
    if (!voitMontants(s))
      for (const ch of ["emoluments","exonere_tva","droits_etat","debours","debours_rembourses",
        "prestations_annexes","autres_depenses","autres_depenses_motif"]) delete d[ch];
    if (!saisitDepenses(s)) delete d.depenses_formalites;
    if (!modifieFormalites(s)) delete d.statut_formalites;
    const ligne = await withTenant(s.etudeId, async (c) => {
      const { rows: avantRows } = await c.query(
        `SELECT * FROM actes WHERE id = $1 AND etude_id = $2 AND supprime_le IS NULL`, [params.id, s.etudeId]);
      if (!avantRows[0]) { const e = new Error("Acte introuvable"); e.status = 404; throw e; }
      const sets = []; const vals = [];
      for (const ch of CHAMPS) if (ch in d) { vals.push(d[ch]); sets.push(`${ch} = $${vals.length}`); }
      if (d.progression === "Terminé" || d.progression === "Annulé")
        sets.push("termine_le = COALESCE(termine_le, now())");
      if (d.progression && d.progression !== "Terminé" && d.progression !== "Annulé")
        sets.push("termine_le = NULL");
      sets.push("modifie_le = now()");
      vals.push(params.id);
      const idPos = vals.length;
      vals.push(s.etudeId);
      const { rows } = await c.query(
        `UPDATE actes SET ${sets.join(", ")} WHERE id = $${idPos} AND etude_id = $${vals.length} RETURNING *`, vals);
      const plafond = plafondReglement(rows[0]);
      if (plafond > 0 && Number(rows[0].montant_regle) > plafond) {
        const e = new Error(`Le montant versé dépasse le total facturé (${plafond.toLocaleString("fr-FR")} F).`);
        e.status = 400; throw e;
      }
      if (Array.isArray(d.parties)) {
        await c.query(`DELETE FROM acte_parties WHERE acte_id = $1 AND etude_id = $2`, [params.id, s.etudeId]);
        const parties = d.parties.filter((p) => p && p.trim());
        for (let i = 0; i < parties.length; i++)
          await c.query(`INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`,
            [s.etudeId, params.id, i + 1, parties[i].trim()]);
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

export async function DELETE(req, { params }) {
  try {
    const s = await exigerNotaire();
    await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `UPDATE actes SET supprime_le = now() WHERE id = $1 AND etude_id = $2 AND supprime_le IS NULL RETURNING *`, [params.id, s.etudeId]);
      if (!rows[0]) { const e = new Error("Acte introuvable"); e.status = 404; throw e; }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: params.id,
        action: "suppression", avant: rows[0], utilisateur: s.uid });
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
