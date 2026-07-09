import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { exigerAdmin, exigerStepUp } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { NIVEAUX, FONCTIONS, estAdministrateur } from "@/lib/acces";
import { isPg, actifFalse } from "@/lib/dialect";

/** Actions du Notaire : desactiver / reactiver / deverrouiller / reinitialiser. */
export async function PATCH(req, { params }) {
  try {
    const s = await exigerAdmin();
    const { action, motDePasseProvisoire, nom_affiche, nom_complet, fonction, niveau_acces } = await req.json();
    if (["desactiver", "reactiver", "deverrouiller", "reinitialiser", "modifier"].includes(action))
      await exigerStepUp();
    if (params.id === s.uid && action === "desactiver")
      return NextResponse.json({ erreur: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
    const ligne = await withTenant(s.etudeId, async (c) => {
      let sql, vals = [params.id, s.etudeId];
      const actifV = isPg() ? "true" : "1";
      const actifF = actifFalse();
      if (action === "desactiver")   sql = `UPDATE utilisateurs SET actif = ${actifF} WHERE id = $1 AND etude_id = $2 AND role <> 'admin_etude'`;
      else if (action === "reactiver") sql = `UPDATE utilisateurs SET actif = ${actifV} WHERE id = $1 AND etude_id = $2`;
      else if (action === "deverrouiller")
        sql = `UPDATE utilisateurs SET verrouille_jusqua = NULL, echecs_connexion = 0 WHERE id = $1 AND etude_id = $2`;
      else if (action === "reinitialiser") {
        if (!motDePasseProvisoire || motDePasseProvisoire.length < 8) {
          const e = new Error("Mot de passe provisoire : au moins 8 caractères."); e.status = 400; throw e;
        }
        const hash = await bcrypt.hash(motDePasseProvisoire, 10);
        vals = [hash, params.id, s.etudeId];
        sql = `UPDATE utilisateurs SET hash_mot_de_passe = $1, doit_changer_mdp = ${actifV},
               verrouille_jusqua = NULL, echecs_connexion = 0 WHERE id = $2 AND etude_id = $3`;
      } else if (action === "modifier") {
        if (niveau_acces && !NIVEAUX.includes(niveau_acces)) { const e = new Error("Niveau d'accès inconnu."); e.status = 400; throw e; }
        if (fonction && !FONCTIONS.includes(fonction)) { const e = new Error("Fonction inconnue."); e.status = 400; throw e; }
        // Un Notaire salarié ne peut pas se promouvoir administrateur.
        if (niveau_acces === "administrateur" && !estAdministrateur(s)) {
          const e = new Error("Seul l'Administrateur peut nommer un Administrateur."); e.status = 403; throw e;
        }
        const role = niveau_acces === "administrateur" || niveau_acces === "notaire_salarie" ? "admin_etude" : "collaborateur";
        vals = [nom_affiche || null, nom_complet || null, fonction || null, niveau_acces || "standard", role, params.id, s.etudeId];
        sql = `UPDATE utilisateurs SET
                 nom_affiche = COALESCE($1, nom_affiche), nom_complet = COALESCE($2, nom_complet),
                 fonction = COALESCE($3, fonction), niveau_acces = $4, role = $5
               WHERE id = $6 AND etude_id = $7`;
      } else { const e = new Error("Action inconnue."); e.status = 400; throw e; }
      const r = await c.query(sql + ` RETURNING id, identifiant, actif`, vals);
      if (!r.rows[0]) { const e = new Error("Compte introuvable ou protégé."); e.status = 404; throw e; }
      await audit(c, { etudeId: s.etudeId, table: "utilisateurs", ligneId: params.id,
        action: "modification", apres: { action }, utilisateur: s.uid });
      return r.rows[0];
    });
    return NextResponse.json(ligne);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Suppression définitive d'un compte — Administrateur uniquement, jamais soi-même. */
export async function DELETE(req, { params }) {
  try {
    const s = await exigerAdmin();
    await exigerStepUp();
    if (!estAdministrateur(s))
      return NextResponse.json({ erreur: "Seul l'Administrateur peut supprimer un compte." }, { status: 403 });
    if (params.id === s.uid)
      return NextResponse.json({ erreur: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
    await withTenant(s.etudeId, async (c) => {
      const r = await c.query(`DELETE FROM utilisateurs WHERE id = $1 AND etude_id = $2 RETURNING identifiant`, [params.id, s.etudeId]);
      if (!r.rows[0]) { const e = new Error("Compte introuvable."); e.status = 404; throw e; }
      await audit(c, { etudeId: s.etudeId, table: "utilisateurs", ligneId: params.id,
        action: "suppression", avant: { identifiant: r.rows[0].identifiant }, utilisateur: s.uid });
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
