import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { voitRegistreActes, filtrerActe, voitMontants } from "@/lib/acces";
import { withTenant, audit, newId } from "@/lib/db";
import { isPg, now, sqlPartiesSubquery, sqlActesInsert, sqlPartiesInsert } from "@/lib/dialect";

export async function GET(req) {
  try {
    const s = await exigerSession();
    if (!voitRegistreActes(s)) {
      const e = new Error("L'Accueil n'a pas accès au registre des actes."); e.status = 403; throw e;
    }
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(p.get("page") || "1", 10));
    const parPage = 50;
    const filtres = []; const valeurs = [];
    const ajouter = (sql, v) => { valeurs.push(v); filtres.push(sql.replace("?", "$" + valeurs.length)); };
    if (p.get("progression")) ajouter("progression = ?", p.get("progression"));
    if (p.get("conservation")) ajouter("conservation_fonciere = ?", p.get("conservation"));
    if (p.get("responsable")) ajouter("responsable = ?", p.get("responsable"));
    if (p.get("nature")) ajouter("nature_acte = ?", p.get("nature"));
    if (p.get("paiement")) ajouter("statut_paiement = ?", p.get("paiement"));
    if (p.get("du")) ajouter("date_ouverture >= ?", p.get("du"));
    if (p.get("au")) ajouter("date_ouverture <= ?", p.get("au"));
    const where = filtres.length ? " AND " + filtres.join(" AND ") : "";
    const { rows, total } = await withTenant(s.etudeId, async (c) => {
      const total = Number((await c.query(
        `SELECT count(*) FROM actes a WHERE a.supprime_le IS NULL ${where}`, valeurs)).rows[0].count);
      const rows = (await c.query(
        `SELECT a.*, ${sqlPartiesSubquery("a")} AS parties
         FROM actes a WHERE a.supprime_le IS NULL ${where}
         ORDER BY a.date_ouverture DESC, a.cree_le DESC
         LIMIT ${parPage} OFFSET ${(page - 1) * parPage}`, valeurs)).rows;
      return { rows, total };
    });
    const visibles = rows.map((r) => filtrerActe(r, s));  // C10 — matrice appliquée côté serveur
    return NextResponse.json({ lignes: visibles, total, page, pages: Math.ceil(total / parPage) || 1 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  let s2 = null;
  try {
    const s = await exigerSession(); s2 = s;
    const d = await req.json();
    // C10 — un collaborateur ne peut pas injecter de montants à la création.
    if (!voitMontants(s))
      for (const ch of ["valeur_acte","honoraires_totaux","montant_regle","statut_paiement",
                        "emoluments","exonere_tva","droits_etat","debours","debours_rembourses",
                        "prestations_annexes"]) delete d[ch];
    if (!d.numero_minute)
      return NextResponse.json({ erreur: "Le N° de minute est obligatoire." }, { status: 400 });
    if (Number(d.montant_regle || 0) > Number(d.honoraires_totaux || 0))
      return NextResponse.json({ erreur: "Le montant réglé ne peut pas dépasser les honoraires totaux." }, { status: 400 });
    if (d.date_echeance && d.date_ouverture && d.date_echeance < d.date_ouverture)
      return NextResponse.json({ erreur: "L'échéance ne peut pas précéder la date d'ouverture." }, { status: 400 });
    // Alerte anti-doublon : sauf si l'utilisateur a confirmé (forcer=true)
    if (!d.forcer) {
      const recent = isPg()
        ? `cree_le > ${now()} - interval '5 minutes'`
        : `cree_le > datetime('now', '-5 minutes')`;
      const doublon = await withTenant(s.etudeId, async (c) =>
        (await c.query(
          `SELECT numero_minute FROM actes WHERE supprime_le IS NULL
             AND (numero_minute = $1 OR (nature_acte = $2 AND ${recent}))
           LIMIT 1`, [d.numero_minute, d.nature_acte || null])).rows[0]);
      if (doublon)
        return NextResponse.json({ doublon: true,
          message: `Un acte similaire existe déjà (${doublon.numero_minute}). Enregistrer quand même ?` }, { status: 409 });
    }
    // Échéance par défaut selon le barème : succession +180 j, simple +20 j, complexe +30 j
    if (!d.date_echeance) {
      const base = d.date_ouverture ? new Date(d.date_ouverture) : new Date();
      const jours = d.nature_acte === "Succession" ? 180 : d.complexite === "Simple" ? 20 : 30;
      base.setDate(base.getDate() + jours);
      d.date_echeance = base.toISOString().slice(0, 10);
    }
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
        const pParams = isPg()
          ? [s.etudeId, acte.id, i + 1, parties[i]]
          : [newId(), s.etudeId, acte.id, i + 1, parties[i]];
        await c.query(sqlPartiesInsert(), pParams);
      }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: acte.id,
        action: "creation", apres: acte, utilisateur: s.uid });
      return acte;
    });
    return NextResponse.json(filtrerActe(ligne, s2), { status: 201 });
  } catch (e) {
    if (e.code === "23505")
      return NextResponse.json({ erreur: "Ce N° de minute existe déjà dans le registre." }, { status: 409 });
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
