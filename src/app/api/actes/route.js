import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant, audit, newId } from "@/lib/db";
import { isPg, sqlActesInsert, sqlActesList, sqlPartiesInsert } from "@/lib/dialect";

export async function GET(req) {
  try {
    const s = exigerSession();
    const p = new URL(req.url).searchParams;
    const filtres = [];
    const valeurs = [s.etudeId];
    const ajouter = (sql, v) => { valeurs.push(v); filtres.push(sql.replace("?", "$" + valeurs.length)); };
    if (p.get("progression")) ajouter("progression = ?", p.get("progression"));
    if (p.get("conservation")) ajouter("conservation_fonciere = ?", p.get("conservation"));
    if (p.get("responsable")) ajouter("responsable = ?", p.get("responsable"));
    if (p.get("nature")) ajouter("nature_acte = ?", p.get("nature"));
    if (p.get("paiement")) ajouter("statut_paiement = ?", p.get("paiement"));
    const where = filtres.length ? " AND " + filtres.join(" AND ") : "";
    const rows = await withTenant(s.etudeId, async (c) =>
      (await c.query(`${sqlActesList()} ${where} ORDER BY a.date_ouverture DESC`, valeurs)).rows);
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
      const params = isPg()
        ? [s.etudeId, d.numero_minute, d.numero_dossier || null, d.date_ouverture || null,
           d.date_echeance || null, d.nature_acte || null, d.complexite || null,
           d.responsable || null, d.conservation_fonciere || null, d.progression,
           d.valeur_acte, d.honoraires_totaux, d.montant_regle, d.statut_paiement,
           d.difficultes || null, d.observations || null, s.uid]
        : [newId(), s.etudeId, d.numero_minute, d.numero_dossier || null, d.date_ouverture || null,
           d.date_echeance || null, d.nature_acte || null, d.complexite || null,
           d.responsable || null, d.conservation_fonciere || null, d.progression,
           d.valeur_acte, d.honoraires_totaux, d.montant_regle, d.statut_paiement,
           d.difficultes || null, d.observations || null, s.uid];
      const { rows } = await c.query(sqlActesInsert(), params);
      const acte = rows[0];
      const parties = Array.isArray(d.parties) ? d.parties.filter(Boolean) : [];
      for (let i = 0; i < parties.length; i++) {
        const p = isPg()
          ? [s.etudeId, acte.id, i + 1, parties[i]]
          : [newId(), s.etudeId, acte.id, i + 1, parties[i]];
        await c.query(sqlPartiesInsert(), p);
      }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: acte.id,
        action: "creation", apres: acte, utilisateur: s.uid });
      return acte;
    });
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
