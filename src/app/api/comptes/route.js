import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { exigerAdmin } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";
import { now } from "@/lib/dialect";

export async function GET() {
  try {
    const s = await exigerAdmin();
    const rows = await withTenant(s.etudeId, async (c) =>
      (await c.query(
        `SELECT id, identifiant, nom_affiche, fonction, role, actif, doit_changer_mdp,
                (verrouille_jusqua IS NOT NULL AND verrouille_jusqua > ${now()}) AS verrouille
         FROM utilisateurs WHERE etude_id = $1 ORDER BY role, nom_affiche`, [s.etudeId])).rows);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Créer un collaborateur — mot de passe provisoire à changer à la première connexion. */
export async function POST(req) {
  try {
    const s = await exigerAdmin();
    const { identifiant, nom_affiche, fonction, motDePasseProvisoire } = await req.json();
    if (!identifiant?.trim() || !nom_affiche?.trim() || !motDePasseProvisoire)
      return NextResponse.json({ erreur: "Identifiant, nom et mot de passe provisoire requis." }, { status: 400 });
    if (!/^[a-z0-9._-]{3,30}$/.test(identifiant))
      return NextResponse.json({ erreur: "Identifiant : 3 à 30 caractères, minuscules, chiffres, . _ - uniquement." }, { status: 400 });
    if (motDePasseProvisoire.length < 10)
      return NextResponse.json({ erreur: "Mot de passe provisoire : au moins 10 caractères." }, { status: 400 });
    const hash = await bcrypt.hash(motDePasseProvisoire, 10);
    const ligne = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO utilisateurs (etude_id, role, identifiant, nom_affiche, fonction, hash_mot_de_passe, doit_changer_mdp)
         VALUES ($1,'collaborateur',$2,$3,$4,$5,true)
         RETURNING id, identifiant, nom_affiche, fonction, role, actif`,
        [s.etudeId, identifiant.trim(), nom_affiche.trim(), fonction || null, hash]);
      await audit(c, { etudeId: s.etudeId, table: "utilisateurs", ligneId: rows[0].id,
        action: "creation", apres: { identifiant, nom_affiche, fonction }, utilisateur: s.uid });
      return rows[0];
    });
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) {
    if (e.code === "23505")
      return NextResponse.json({ erreur: "Cet identifiant est déjà utilisé sur la plateforme (peut-être par une autre étude). Choisissez-en un autre, par exemple en le préfixant : kouassi.clerc1." }, { status: 409 });
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
