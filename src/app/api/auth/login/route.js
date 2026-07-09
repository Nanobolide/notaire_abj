import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { creerSession } from "@/lib/auth";
import { isPg, actifClause, lockAccountSql } from "@/lib/dialect";

const selectUser = `SELECT u.id, u.etude_id, u.role, u.nom_affiche, u.fonction, u.niveau_acces,
        u.hash_mot_de_passe, u.doit_changer_mdp, u.echecs_connexion, u.verrouille_jusqua,
        e.statut AS etude_statut, e.nom AS etude_nom
 FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
 WHERE u.identifiant = $1 AND ${actifClause("u")}`;

export async function POST(req) {
  try {
    const { identifiant, motDePasse } = await req.json();
    if (!identifiant || !motDePasse)
      return NextResponse.json({ erreur: "Identifiant et mot de passe requis." }, { status: 400 });

    let user;
    if (isPg()) {
      try {
        const { rows } = await db.query(`SELECT * FROM auth_lookup($1)`, [identifiant]);
        user = rows[0];
      } catch {
        const { rows } = await db.query(selectUser, [identifiant]);
        user = rows[0];
      }
    } else {
      const { rows } = await db.query(selectUser, [identifiant]);
      user = rows[0];
    }

    const refus = () => NextResponse.json({ erreur: "Identifiant ou mot de passe incorrect." }, { status: 401 });
    if (!user) return refus();
    if (user.etude_statut !== "active")
      return NextResponse.json({ erreur: "Étude désactivée. Contactez l'éditeur." }, { status: 403 });
    if (user.verrouille_jusqua && new Date(user.verrouille_jusqua) > new Date())
      return NextResponse.json({ erreur: "Compte verrouillé après 5 échecs. Demandez au Notaire de le déverrouiller." }, { status: 423 });

    const ok = await bcrypt.compare(motDePasse, user.hash_mot_de_passe);
    if (isPg()) {
      try {
        await db.query(`SELECT auth_apres_tentative($1, $2)`, [user.id, ok]);
      } catch {
        if (ok) {
          await db.query("UPDATE utilisateurs SET echecs_connexion = 0, verrouille_jusqua = NULL WHERE id = $1", [user.id]);
        } else {
          const echecs = user.echecs_connexion + 1;
          if (user.role !== "admin_etude" && echecs >= 5) {
            await db.query(
              `UPDATE utilisateurs SET echecs_connexion = $1, ${lockAccountSql()} WHERE id = $2`,
              [echecs, user.id]
            );
          } else {
            await db.query("UPDATE utilisateurs SET echecs_connexion = $1 WHERE id = $2", [echecs, user.id]);
          }
        }
      }
    } else if (ok) {
      await db.query("UPDATE utilisateurs SET echecs_connexion = 0, verrouille_jusqua = NULL WHERE id = $1", [user.id]);
    } else {
      const echecs = user.echecs_connexion + 1;
      if (user.role !== "admin_etude" && echecs >= 5) {
        await db.query(
          `UPDATE utilisateurs SET echecs_connexion = $1, ${lockAccountSql()} WHERE id = $2`,
          [echecs, user.id]
        );
      } else {
        await db.query("UPDATE utilisateurs SET echecs_connexion = $1 WHERE id = $2", [echecs, user.id]);
      }
    }
    if (!ok) return refus();

    creerSession(user);
    return NextResponse.json({
      nom: user.nom_affiche, role: user.role, doitChangerMdp: !!user.doit_changer_mdp
    });
  } catch (e) {
    const bd = /connect|password|database|ECONNREFUSED|ENOTFOUND/i.test(e.message);
    return NextResponse.json({
      erreur: bd
        ? "Base de données injoignable. En local : lancez « npm run dev » (migration automatique) ou « npm run db:migrate »."
        : "Erreur du serveur : " + e.message
    }, { status: 500 });
  }
}
