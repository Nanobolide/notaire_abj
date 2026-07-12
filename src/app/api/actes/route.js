import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { voitRegistreActes, filtrerActe, voitMontants, saisitPrevision, plafondReglement } from "@/lib/acces";
import { echeanceParDefaut } from "@/lib/regles";
import { withTenant, audit, newId } from "@/lib/db";
import { isPg, depuisMinutes, sqlPartiesSubquery } from "@/lib/dialect";

export async function GET(req) {
  try {
    const s = await exigerSession();
    if (!voitRegistreActes(s)) {
      const e = new Error("L'Accueil n'a pas accès au registre des actes.");
      e.status = 403;
      throw e;
    }
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(p.get("page") || "1", 10));
    const parPage = 50;
    const filtres = []; const valeurs = [s.etudeId];
    const ajouter = (sql, v) => { valeurs.push(v); filtres.push(sql.replace("?", "$" + valeurs.length)); };
    if (p.get("progression")) ajouter("progression = ?", p.get("progression"));
    if (p.get("conservation")) ajouter("conservation_fonciere = ?", p.get("conservation"));
    if (p.get("responsable")) ajouter("responsable = ?", p.get("responsable"));
    if (p.get("nature")) ajouter("nature_acte = ?", p.get("nature"));
    if (p.get("paiement")) ajouter("statut_paiement = ?", p.get("paiement"));
    if (p.get("du")) ajouter("date_ouverture >= ?", p.get("du"));
    if (p.get("au")) ajouter("date_ouverture <= ?", p.get("au"));
    const where = filtres.length ? " AND " + filtres.join(" AND ") : "";
    const partiesSql = sqlPartiesSubquery("a");
    const { rows, total } = await withTenant(s.etudeId, async (c) => {
      const total = Number((await c.query(
        `SELECT count(*) AS count FROM actes a WHERE a.etude_id = $1 AND a.supprime_le IS NULL ${where}`, valeurs)).rows[0].count);
      const rows = (await c.query(
        `SELECT a.*, ${partiesSql} AS parties
         FROM actes a WHERE a.etude_id = $1 AND a.supprime_le IS NULL ${where}
         ORDER BY a.date_ouverture DESC, a.cree_le DESC
         LIMIT ${parPage} OFFSET ${(page - 1) * parPage}`, valeurs)).rows;
      return { rows, total };
    });
    const visibles = rows.map((r) => filtrerActe(r, s));
    return NextResponse.json({ lignes: visibles, total, page, pages: Math.ceil(total / parPage) || 1 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  let s2 = null;
  try {
    const s = await exigerSession(); s2 = s;
    const d = await req.json();
    if (!saisitPrevision(s))
      for (const ch of ["valeur_acte","honoraires_totaux","montant_regle","statut_paiement"]) delete d[ch];
    if (!voitMontants(s))
      for (const ch of ["emoluments","exonere_tva","droits_etat","debours",
        "autres_depenses","autres_depenses_motif"]) delete d[ch];
    if (!d.responsable?.trim()) {
      const { rows: [n] } = await withTenant(s.etudeId, async (c) =>
        c.query(
          `SELECT nom_affiche FROM utilisateurs WHERE etude_id = $1 AND niveau_acces = 'administrateur'
             AND actif = true ORDER BY cree_le LIMIT 1`, [s.etudeId]));
      if (n) d.responsable = n.nom_affiche;
    }
    if (!d.numero_minute)
      return NextResponse.json({ erreur: "Le N° de minute est obligatoire." }, { status: 400 });
    const plafond = plafondReglement(d);
    if (plafond > 0 && Number(d.montant_regle || 0) > plafond)
      return NextResponse.json({ erreur: `Le montant versé (${Number(d.montant_regle).toLocaleString("fr-FR")} F) dépasse le total facturé (${plafond.toLocaleString("fr-FR")} F).` }, { status: 400 });
    if (d.date_echeance && d.date_ouverture && d.date_echeance < d.date_ouverture)
      return NextResponse.json({ erreur: "L'échéance ne peut pas précéder la date d'ouverture." }, { status: 400 });
    if (!d.forcer) {
      const doublon = await withTenant(s.etudeId, async (c) =>
        (await c.query(
          `SELECT numero_minute FROM actes WHERE etude_id = $1 AND supprime_le IS NULL
             AND (numero_minute = $2 OR (nature_acte = $3 AND cree_le > ${depuisMinutes(5)}))
           LIMIT 1`, [s.etudeId, d.numero_minute, d.nature_acte || null])).rows[0]);
      if (doublon)
        return NextResponse.json({ doublon: true,
          message: `Un acte similaire existe déjà (${doublon.numero_minute}). Enregistrer quand même ?` }, { status: 409 });
    }
    if (!d.date_echeance)
      d.date_echeance = echeanceParDefaut(d.nature_acte, d.complexite, d.date_ouverture);
    const ligne = await withTenant(s.etudeId, async (c) => {
      const baseParams = [s.etudeId, d.numero_minute, d.numero_dossier || null, d.date_ouverture || null,
        d.date_echeance || null, d.nature_acte || null, d.complexite || null,
        d.responsable || null, d.conservation_fonciere || null, d.progression,
        d.valeur_acte, d.honoraires_totaux, d.montant_regle, d.statut_paiement,
        d.emoluments, d.exonere_tva, d.droits_etat, d.debours, d.debours_rembourses,
        d.prestations_annexes, d.autres_depenses, d.autres_depenses_motif || null,
        d.difficultes || null, d.observations || null, s.uid];
      let rows;
      if (isPg()) {
        ({ rows } = await c.query(
          `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
             nature_acte, complexite, responsable, conservation_fonciere, progression,
             valeur_acte, honoraires_totaux, montant_regle, statut_paiement,
             emoluments, exonere_tva, droits_etat, debours, debours_rembourses,
             prestations_annexes, autres_depenses, autres_depenses_motif,
             difficultes, observations, saisi_par)
           VALUES ($1,$2,$3, COALESCE($4::date, CURRENT_DATE), COALESCE($5::date, CURRENT_DATE + 30),
                   $6,$7,$8,$9, COALESCE($10,'Rédaction'),
                   COALESCE($11,0),COALESCE($12,0),COALESCE($13,0), COALESCE($14,'En attente'),
                   COALESCE($15,0),COALESCE($16,false),COALESCE($17,0),COALESCE($18,0),COALESCE($19,false),
                   COALESCE($20,0),COALESCE($21,0),$22, $23, $24, $25)
           RETURNING *`, baseParams));
      } else {
        const id = newId();
        ({ rows } = await c.query(
          `INSERT INTO actes (id, etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
             nature_acte, complexite, responsable, conservation_fonciere, progression,
             valeur_acte, honoraires_totaux, montant_regle, statut_paiement,
             emoluments, exonere_tva, droits_etat, debours, debours_rembourses,
             prestations_annexes, autres_depenses, autres_depenses_motif,
             difficultes, observations, saisi_par)
           VALUES ($1,$2,$3,$4,
                   COALESCE($5, date('now')), COALESCE($6, date('now', '+30 days')),
                   $7,$8,$9,$10,$11, COALESCE($12,0),COALESCE($13,0),COALESCE($14,0), COALESCE($15,'En attente'),
                   COALESCE($16,0),COALESCE($17,0),COALESCE($18,0),COALESCE($19,0),COALESCE($20,0),
                   COALESCE($21,0),COALESCE($22,0),$23, $24, $25, $26)
           RETURNING *`, [id, ...baseParams]));
      }
      const acte = rows[0];
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
    return NextResponse.json(filtrerActe(ligne, s2), { status: 201 });
  } catch (e) {
    if (e.code === "23505")
      return NextResponse.json({ erreur: "Ce N° de minute existe déjà dans le registre." }, { status: 409 });
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
