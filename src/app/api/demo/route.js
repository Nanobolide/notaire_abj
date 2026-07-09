import { NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { DEMO_ACTES, DEMO_APPELS } from "@/lib/demo-data";
import { isPg, now } from "@/lib/dialect";
import { newId } from "@/lib/db";

const MARQUEUR = "2026/0201"; // première minute de la démonstration

/** Charger la démonstration — uniquement si les registres sont vides. */
export async function POST() {
  try {
    const s = await exigerAdmin();
    const resultat = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT (SELECT count(*) FROM actes WHERE etude_id = $1 AND supprime_le IS NULL)
              + (SELECT count(*) FROM appels_courriers WHERE etude_id = $1 AND supprime_le IS NULL) AS total`,
        [s.etudeId]);
      if (Number(rows[0].total) > 0) {
        const e = new Error("Les registres ne sont pas vides : chargement refusé pour ne rien écraser.");
        e.status = 409; throw e;
      }
      const uid = async (nom) => {
        const m = { "Secrétariat": "secretariat", "Accueil": "accueil", "Clerc 1": "clerc1", "Le Notaire": "notaire" };
        if (!m[nom]) return null;
        const r = await c.query(`SELECT id FROM utilisateurs WHERE identifiant = $1 AND etude_id = $2`, [m[nom], s.etudeId]);
        return r.rows[0]?.id || null;
      };
      for (const a of DEMO_ACTES) {
        const termineSql = isPg()
          ? `CASE WHEN $11 THEN ${now()} ELSE NULL END`
          : `CASE WHEN $12 THEN ${now()} ELSE NULL END`;
        const params = isPg()
          ? [s.etudeId, a.numero_minute, a.numero_dossier, a.date_ouverture, a.date_echeance,
             a.nature_acte, a.complexite, a.responsable, a.conservation_fonciere, a.progression, a.fini,
             a.valeur_acte, a.honoraires_totaux, a.montant_regle, a.statut_paiement,
             a.difficultes, a.observations, await uid(a.saisi)]
          : [newId(), s.etudeId, a.numero_minute, a.numero_dossier, a.date_ouverture, a.date_echeance,
             a.nature_acte, a.complexite, a.responsable, a.conservation_fonciere, a.progression, a.fini,
             a.valeur_acte, a.honoraires_totaux, a.montant_regle, a.statut_paiement,
             a.difficultes, a.observations, await uid(a.saisi)];
        const insertSql = isPg()
          ? `INSERT INTO actes (etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
             nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
             valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ${termineSql},
                   $12,$13,$14,$15,$16,$17,$18) RETURNING id`
          : `INSERT INTO actes (id, etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance,
             nature_acte, complexite, responsable, conservation_fonciere, progression, termine_le,
             valeur_acte, honoraires_totaux, montant_regle, statut_paiement, difficultes, observations, saisi_par)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, ${termineSql},
                   $13,$14,$15,$16,$17,$18,$19) RETURNING id`;
        const { rows: ins } = await c.query(insertSql, params);
        for (let i = 0; i < a.parties.length; i++) {
          const p = isPg()
            ? [s.etudeId, ins[0].id, i + 1, a.parties[i]]
            : [newId(), s.etudeId, ins[0].id, i + 1, a.parties[i]];
          await c.query(
            isPg()
              ? `INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4)`
              : `INSERT INTO acte_parties (id, etude_id, acte_id, ordre, nom_partie) VALUES ($1,$2,$3,$4,$5)`,
            p
          );
        }
        if (a.piece) {
          const pl = isPg()
            ? [s.etudeId, ins[0].id, "Pièce manquante : " + a.piece, await uid(a.saisi)]
            : [newId(), s.etudeId, ins[0].id, "Pièce manquante : " + a.piece, await uid(a.saisi)];
          await c.query(
            isPg()
              ? `INSERT INTO pieces_log (etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4)`
              : `INSERT INTO pieces_log (id, etude_id, acte_id, texte, auteur) VALUES ($1,$2,$3,$4,$5)`,
            pl
          );
        }
      }
      for (const p of DEMO_APPELS) {
        const resoluSql = isPg()
          ? `CASE WHEN $14 THEN ($4::date + interval '1 day' + time '17:00') ELSE NULL END`
          : `CASE WHEN $16 THEN datetime($6, '+1 day', '17:00') ELSE NULL END`;
        const apParams = isPg()
          ? [s.etudeId, p.numero, p.type_flux, p.date_entree, p.heure, p.reference_dossier,
             p.client_nom, p.telephone, p.email, p.destinataire, p.motif, p.statut_traitement,
             p.nb_tentatives, p.resolu, p.observations, await uid(p.saisi)]
          : [newId(), s.etudeId, p.numero, 2026, p.type_flux, p.date_entree, p.heure, p.reference_dossier,
             p.client_nom, p.telephone, p.email, p.destinataire, p.motif, p.statut_traitement,
             p.nb_tentatives, p.resolu, p.observations, await uid(p.saisi)];
        const apSql = isPg()
          ? `INSERT INTO appels_courriers (etude_id, numero, annee, type_flux, date_entree, heure,
             reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
             nb_tentatives, resolu_le, observations, saisi_par)
           VALUES ($1,$2,2026,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, ${resoluSql}, $15, $16)`
          : `INSERT INTO appels_courriers (id, etude_id, numero, annee, type_flux, date_entree, heure,
             reference_dossier, client_nom, telephone, email, destinataire, motif, statut_traitement,
             nb_tentatives, resolu_le, observations, saisi_par)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, ${resoluSql}, $17, $18)`;
        await c.query(apSql, apParams);
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
      if (isPg()) {
        await c.query(`SELECT purger_registres_demo($1, $2)`, [s.etudeId, s.uid]);
        return;
      }
      const { rows } = await c.query(
        `SELECT 1 FROM actes WHERE etude_id = $1 AND numero_minute = '2026/0201' LIMIT 1`, [s.etudeId]);
      if (!rows[0]) {
        const e = new Error("Les données présentes ne sont pas celles de la démonstration : effacement refusé.");
        e.status = 409; throw e;
      }
      await c.query(`DELETE FROM pieces_log WHERE etude_id = $1`, [s.etudeId]);
      await c.query(`DELETE FROM acte_parties WHERE etude_id = $1`, [s.etudeId]);
      await c.query(`DELETE FROM actes WHERE etude_id = $1`, [s.etudeId]);
      await c.query(`DELETE FROM appels_courriers WHERE etude_id = $1`, [s.etudeId]);
      await audit(c, { etudeId: s.etudeId, table: "actes", action: "suppression",
        apres: { evenement: "effacement_demonstration" }, utilisateur: s.uid });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e.message.includes("démonstration") ? e.message
      : "Effacement impossible : " + e.message;
    return NextResponse.json({ erreur: msg }, { status: 409 });
  }
}
