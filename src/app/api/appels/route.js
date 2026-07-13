import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { voitRegistreAppels } from "@/lib/acces";
import { withTenant, audit } from "@/lib/db";

export async function GET(req) {
  try {
    const s = await exigerSession();
    if (!voitRegistreAppels(s)) {
      const e = new Error("Le Comptable n'a pas accès au registre des appels."); e.status = 403; throw e;
    }
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(p.get("page") || "1", 10));
    const parPage = 50;
    const filtres = []; const valeurs = [];
    const ajouter = (sql, v) => { valeurs.push(v); filtres.push(sql.replace("?", "$" + valeurs.length)); };
    if (p.get("statut")) ajouter("statut_traitement = ?", p.get("statut"));
    if (p.get("motif")) ajouter("motif = ?", p.get("motif"));
    if (p.get("destinataire")) ajouter("destinataire = ?", p.get("destinataire"));
    if (p.get("du")) ajouter("date_entree >= ?", p.get("du"));
    if (p.get("au")) ajouter("date_entree <= ?", p.get("au"));
    const where = filtres.length ? " AND " + filtres.join(" AND ") : "";
    const { rows, total } = await withTenant(s.etudeId, async (c) => {
      const total = Number((await c.query(
        `SELECT count(*) FROM appels_courriers a WHERE a.supprime_le IS NULL ${where}`, valeurs)).rows[0].count);
      const rows = (await c.query(
        `SELECT a.*, u.nom_affiche AS saisi_par_nom FROM appels_courriers a
         LEFT JOIN utilisateurs u ON u.id = a.saisi_par
         WHERE a.supprime_le IS NULL ${where}
         ORDER BY a.annee DESC, a.numero DESC
         LIMIT ${parPage} OFFSET ${(page - 1) * parPage}`, valeurs)).rows;
      return { rows, total };
    });
    return NextResponse.json({ lignes: rows, total, page, pages: Math.ceil(total / parPage) || 1 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    const s = await exigerSession();
    const d = await req.json();
    if (!d.client_nom || !d.type_flux)
      return NextResponse.json({ erreur: "Nom du client et type de flux obligatoires." }, { status: 400 });
    // Alerte anti-doublon : même client + même contact saisis il y a moins de 2 minutes
    if (!d.forcer) {
      const doublon = await withTenant(s.etudeId, async (c) =>
        (await c.query(
          `SELECT 1 FROM appels_courriers WHERE supprime_le IS NULL
             AND client_nom = $1 AND COALESCE(telephone,'') = COALESCE($2,'')
             AND cree_le > now() - interval '2 minutes' LIMIT 1`,
          [d.client_nom, d.telephone || null])).rows[0]);
      if (doublon)
        return NextResponse.json({ doublon: true,
          message: `Une entrée pour « ${d.client_nom} » vient d'être enregistrée il y a moins de 2 minutes. Enregistrer quand même ?` }, { status: 409 });
    }
    // C5 — en cas de collision de numéro (saisies simultanées), on retente jusqu'à 3 fois
    let ligne, tentative = 0;
    for (;;) {
      try {
        ligne = await withTenant(s.etudeId, async (c) => {
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
        break;
      } catch (e) {
        if (e.code === "23505" && ++tentative < 3) continue;
        throw e;
      }
    }
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
