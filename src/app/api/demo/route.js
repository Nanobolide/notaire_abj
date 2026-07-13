import { NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { DEMO_ACTES, DEMO_APPELS } from "@/lib/demo-data";

const MARQUEUR = "2026/0201"; // première minute de la démonstration

/** Charger la démonstration — uniquement si les registres sont vides. */
export async function POST() {
  try {
    const s = await exigerAdmin();
    const resultat = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT (SELECT count(*) FROM actes WHERE supprime_le IS NULL)
              + (SELECT count(*) FROM appels_courriers WHERE supprime_le IS NULL) AS total`);
      if (Number(rows[0].total) > 0) {
        const e = new Error("Les registres ne sont pas vides : chargement refusé pour ne rien écraser.");
        e.status = 409; throw e;
      }
      const uid = async (nom) => {
        const m = { "Secrétariat": "secretariat", "Accueil": "accueil", "Clerc 1": "clerc1", "Le Notaire": "notaire" };
        if (!m[nom]) return null;
        const r = await c.query(`SELECT id FROM utilisateurs WHERE identifiant = $1`, [m[nom]]);
        return r.rows[0]?.id || null;
      };
      for (const a of DEMO_ACTES) {
        const { rows: ins } = await c.query(
          `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
             nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
             valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par,
             emoluments, exonere_tva, droits_etat, debours, depenses_formalites,
             autres_depenses, statut_formalites)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $11 THEN now() ELSE NULL END,
                   $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING id`,
          [s.etudeId, a.numero_minute, a.numero_dossier, a.date_ouverture, a.date_echeance,
           a.nature_acte, a.complexite, a.responsable, a.conservation_fonciere, a.progression, a.fini,
           a.valeur_acte, a.honoraires_totaux, a.montant_regle, a.statut_paiement,
           a.difficultes, a.observations, await uid(a.saisi),
           a.emoluments ?? 0, false, a.droits_etat ?? 0, a.debours ?? 0,
           a.depenses_formalites ?? 0,
           a.autres_depenses ?? 0, a.statut_formalites ?? "Pas encore débuté"]);
        for (let i = 0; i < a.parties.length; i++)
          await c.query(`INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`,
            [s.etudeId, ins[0].id, i + 1, a.parties[i]]);
        if (a.piece)
          await c.query(`INSERT INTO pieces_log (etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4)`,
            [s.etudeId, ins[0].id, "Pièce manquante : " + a.piece, await uid(a.saisi)]);
      }
      for (const p of DEMO_APPELS) {
        await c.query(
          `INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
             reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
             nb_tentatives, resolu_le, observations, saisi_par)
           VALUES ($1,$2,2026,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                   CASE WHEN $14 THEN ($4::date + interval '1 day' + time '17:00') ELSE NULL END, $15, $16)`,
          [s.etudeId, p.numero, p.type_flux, p.date_entree, p.heure, p.reference_dossier,
           p.client_nom, p.telephone, p.email, p.destinataire, p.motif, p.statut_traitement,
           p.nb_tentatives, p.resolu, p.observations, await uid(p.saisi)]);
      }
      await audit(c, { etudeId: s.etudeId, table: "actes", action: "creation",
        apres: { evenement: "chargement_demonstration" }, utilisateur: s.uid });
      return { actes: DEMO_ACTES.length, appels: DEMO_APPELS.length };
    });
    return NextResponse.json(resultat, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Effacer la démonstration — la fonction SQL refuse si le marqueur de démo est absent. */
export async function DELETE() {
  try {
    const s = await exigerAdmin();
    await withTenant(s.etudeId, async (c) => {
      await c.query(`SELECT purger_registres_demo($1, $2)`, [s.etudeId, s.uid]);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e.message.includes("démonstration") ? e.message
      : "Effacement impossible : " + e.message;
    return NextResponse.json({ erreur: msg }, { status: 409 });
  }
}
