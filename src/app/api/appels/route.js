import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant, audit, newId } from "@/lib/db";
import { isPg, sqlAppelsInsert, sqlAppelsNumero } from "@/lib/dialect";

export async function GET(req) {
  try {
    const s = exigerSession();
    const p = new URL(req.url).searchParams;
    const filtres = [];
    const valeurs = [s.etudeId];
    const ajouter = (sql, v) => { valeurs.push(v); filtres.push(sql.replace("?", "$" + valeurs.length)); };
    if (p.get("statut")) ajouter("statut_traitement = ?", p.get("statut"));
    if (p.get("motif")) ajouter("motif = ?", p.get("motif"));
    if (p.get("destinataire")) ajouter("destinataire = ?", p.get("destinataire"));
    if (p.get("du")) ajouter("date_entree >= ?", p.get("du"));
    if (p.get("au")) ajouter("date_entree <= ?", p.get("au"));
    const where = filtres.length ? " AND " + filtres.join(" AND ") : "";
    const rows = await withTenant(s.etudeId, async (c) =>
      (await c.query(
        `SELECT a.*, u.nom_affiche AS saisi_par_nom FROM appels_courriers a
         LEFT JOIN utilisateurs u ON u.id = a.saisi_par
         WHERE a.etude_id = $1 AND a.supprime_le IS NULL ${where}
         ORDER BY a.annee DESC, a.numero DESC`, valeurs)).rows);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    const s = exigerSession();
    const d = await req.json();
    if (!d.client_nom || !d.type_flux)
      return NextResponse.json({ erreur: "Nom du client et type de flux obligatoires." }, { status: 400 });
    const ligne = await withTenant(s.etudeId, async (c) => {
      let rows;
      if (isPg()) {
        ({ rows } = await c.query(sqlAppelsInsert(), [
          s.etudeId, d.type_flux, d.date_entree || null, d.heure || null, d.reference_dossier || null,
          d.client_nom, d.telephone || null, d.email || null, d.destinataire || null,
          d.mis_en_relation ?? null, d.motif || null, d.statut_traitement, d.nb_tentatives,
          d.observations || null, s.uid
        ]));
      } else {
        const { rows: numRows } = await c.query(sqlAppelsNumero(), [s.etudeId]);
        ({ rows } = await c.query(sqlAppelsInsert(), [
          newId(), s.etudeId, numRows[0].n, d.type_flux, d.date_entree || null, d.heure || null,
          d.reference_dossier || null, d.client_nom, d.telephone || null, d.email || null,
          d.destinataire || null, d.mis_en_relation ?? null, d.motif || null, d.statut_traitement,
          d.nb_tentatives, d.observations || null, s.uid
        ]));
      }
      await audit(c, { etudeId: s.etudeId, table: "appels_courriers", ligneId: rows[0].id,
        action: "creation", apres: rows[0], utilisateur: s.uid });
      return rows[0];
    });
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
