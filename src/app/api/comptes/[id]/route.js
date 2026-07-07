import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { exigerAdmin } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { isPg, actifFalse } from "@/lib/dialect";

/** Actions du Notaire : desactiver / reactiver / deverrouiller / reinitialiser. */
export async function PATCH(req, { params }) {
  try {
    const s = await exigerAdmin();
    const { action, motDePasseProvisoire } = await req.json();
    if (params.id === s.uid && action === "desactiver")
      return NextResponse.json({ erreur: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
    const ligne = await withTenant(s.etudeId, async (c) => {
      let sql, vals = [params.id];
      const actifV = isPg() ? "true" : "1";
      const actifF = actifFalse();
      if (action === "desactiver")   sql = `UPDATE utilisateurs SET actif = ${actifF} WHERE id = $1 AND role <> 'admin_etude'`;
      else if (action === "reactiver") sql = `UPDATE utilisateurs SET actif = ${actifV} WHERE id = $1`;
      else if (action === "deverrouiller")
        sql = `UPDATE utilisateurs SET verrouille_jusqua = NULL, echecs_connexion = 0 WHERE id = $1`;
      else if (action === "reinitialiser") {
        if (!motDePasseProvisoire || motDePasseProvisoire.length < 3) {
          const e = new Error("Mot de passe provisoire : au moins 3 caractères."); e.status = 400; throw e;
        }
        const hash = await bcrypt.hash(motDePasseProvisoire, 10);
        vals = [hash, params.id];
        sql = `UPDATE utilisateurs SET hash_mot_de_passe = $1, doit_changer_mdp = ${actifV},
               verrouille_jusqua = NULL, echecs_connexion = 0 WHERE id = $2`;
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
