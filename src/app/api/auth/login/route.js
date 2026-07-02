import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { creerSession } from "@/lib/auth";

export async function POST(req) {
  const { identifiant, motDePasse } = await req.json();
  if (!identifiant || !motDePasse)
    return NextResponse.json({ erreur: "Identifiant et mot de passe requis." }, { status: 400 });

  // La table utilisateurs est protégée par RLS : la connexion passe par une
  // fonction SECURITY DEFINER au périmètre minimal (cf. db/schema.sql).
  const { rows } = await pool.query(`SELECT * FROM auth_lookup($1)`, [identifiant]);
  const user = rows[0];

  const refus = () => NextResponse.json({ erreur: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  if (!user) return refus();
  if (user.etude_statut !== "active")
    return NextResponse.json({ erreur: "Étude désactivée. Contactez l'éditeur." }, { status: 403 });
  if (user.verrouille_jusqua && new Date(user.verrouille_jusqua) > new Date())
    return NextResponse.json({ erreur: "Compte verrouillé après 5 échecs. Demandez au Notaire de le déverrouiller." }, { status: 423 });

  const ok = await bcrypt.compare(motDePasse, user.hash_mot_de_passe);
  await pool.query(`SELECT auth_apres_tentative($1, $2)`, [user.id, ok]);
  if (!ok) return refus();

  creerSession(user);
  return NextResponse.json({
    nom: user.nom_affiche, role: user.role, doitChangerMdp: user.doit_changer_mdp
  });
}
