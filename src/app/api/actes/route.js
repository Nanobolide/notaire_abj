import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";

export async function GET(req) {
  try {
    const s = exigerSession();
    const p = new URL(req.url).searchParams;
    const filtres = []; const valeurs = [];
    const ajouter = (sql, v) => { valeurs.push(v); filtres.push(sql.replace("?", "$" + valeurs.length)); };
    if (p.get("progression")) ajouter("progression = ?", p.get("progression"));
    if (p.get("conservation")) ajouter("conservation_fonciere = ?", p.get("conservation"));
    if (p.get("responsable")) ajouter("responsable = ?", p.get("responsable"));
    if (p.get("nature")) ajouter("nature_acte = ?", p.get("nature"));
    if (p.get("paiement")) ajouter("statut_paiement = ?", p.get("paiement"));
    const where = filtres.length ? " AND " + filtres.join(" AND ") : "";
    const rows = await withTenant(s.etudeId, async (c) =>
      (await c.query(
        `SELECT a.*,
                COALESCE((SELECT string_agg(p.nom_partie, ' / ' ORDER BY p.ordre)
                          FROM acte_parties p WHERE p.acte_id = a.id), '') AS parties
         FROM actes a WHERE a.supprime_le IS NULL ${where}
         ORDER BY a.date_ouverture DESC`, valeurs)).rows);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    const s = exigerSession();
    const d = await req.json();
    if (!d.numero_minute)
      return NextResponse.json({ erreur: "Le N° de minute est obligatoire." }, { status: 400 });
    const ligne = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
           nature_acte, complexite, responsable, conservation_fonciere, progression,
           valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
         VALUES ($1,$2,$3, COALESCE($4::date, CURRENT_DATE),
                 COALESCE($5::date, CURRENT_DATE + 14),          -- échéance auto J+14
                 $6,$7,$8,$9, COALESCE($10,'Rédaction'),
                 COALESCE($11,0),COALESCE($12,0),COALESCE($13,0),
                 COALESCE($14,'En attente'), $15, $16, $17)
         RETURNING *`,
        [s.etudeId, d.numero_minute, d.numero_dossier || null, d.date_ouverture || null,
         d.date_echeance || null, d.nature_acte || null, d.complexite || null,
         d.responsable || null, d.conservation_fonciere || null, d.progression,
         d.valeur_acte, d.honoraires_totaux, d.montant_regle, d.statut_paiement,
         d.difficultes || null, d.observations || null, s.uid]);
      const acte = rows[0];
      // Parties multiples (Partie 1, 2, 3...)
      const parties = Array.isArray(d.parties) ? d.parties.filter(Boolean) : [];
      for (let i = 0; i < parties.length; i++) {
        await c.query(
          `INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`,
          [s.etudeId, acte.id, i + 1, parties[i]]);
      }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: acte.id,
        action: "creation", apres: acte, utilisateur: s.uid });
      return acte;
    });
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
