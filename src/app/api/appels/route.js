import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";

export async function GET(req) {
  try {
    const s = exigerSession();
    const p = new URL(req.url).searchParams;
    const filtres = []; const valeurs = [];
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
         WHERE a.supprime_le IS NULL ${where}
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
      const { rows } = await c.query(
        `INSERT INTO appels_courriers
          (etude_id, numero, type_flux, date_entree, heure, reference_dossier, client_nom,
           telephone, email, destinataire, mis_en_relation, motif, statut_traitement,
           nb_tentatives, observations, saisi_par)
         VALUES ($1, prochain_numero_appel($1), $2,
                 COALESCE($3::date, CURRENT_DATE), COALESCE($4::time, LOCALTIME),
                 $5,$6,$7,$8,$9,$10,$11,COALESCE($12,'Non commencé'),COALESCE($13,0),$14,$15)
         RETURNING *`,
        [s.etudeId, d.type_flux, d.date_entree || null, d.heure || null, d.reference_dossier || null,
         d.client_nom, d.telephone || null, d.email || null, d.destinataire || null,
         d.mis_en_relation ?? null, d.motif || null, d.statut_traitement, d.nb_tentatives,
         d.observations || null, s.uid]);
      await audit(c, { etudeId: s.etudeId, table: "appels_courriers", ligneId: rows[0].id,
        action: "creation", apres: rows[0], utilisateur: s.uid });
      return rows[0];
    });
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
