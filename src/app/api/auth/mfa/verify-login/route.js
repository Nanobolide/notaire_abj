import { NextResponse } from "next/server";
import { verify } from "otplib";
import { verifierMfaChallenge, creerSession } from "@/lib/auth";
import { withTenant, securityEvent } from "@/lib/db";

export async function POST(req) {
  try {
    const { challengeToken, code } = await req.json();
    if (!challengeToken || !code)
      return NextResponse.json({ erreur: "Challenge et code MFA requis." }, { status: 400 });

    const challenge = verifierMfaChallenge(challengeToken);
    const user = await withTenant(challenge.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT u.id, u.etude_id, u.role, u.nom_affiche, u.fonction, u.niveau_acces, u.doit_changer_mdp,
                u.mfa_active, u.mfa_secret, e.nom AS etude_nom
         FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
         WHERE u.id = $1`,
        [challenge.uid]
      );
      return rows[0];
    });
    if (!user?.mfa_active || !user.mfa_secret)
      return NextResponse.json({ erreur: "MFA non configuré pour ce compte." }, { status: 400 });

    const ok = verify({ token: String(code).trim(), secret: user.mfa_secret });
    if (!ok) {
      await withTenant(user.etude_id, (c) => securityEvent(c, {
        etudeId: user.etude_id, utilisateur: user.id, typeEvenement: "auth.mfa_login_failed", severite: "warning",
      }));
      return NextResponse.json({ erreur: "Code MFA invalide." }, { status: 401 });
    }

    creerSession(user, { mfaLevel: "full" });
    await withTenant(user.etude_id, (c) => securityEvent(c, {
      etudeId: user.etude_id, utilisateur: user.id, typeEvenement: "auth.mfa_login_success",
    }));
    return NextResponse.json({ ok: true, nom: user.nom_affiche, role: user.role, doitChangerMdp: !!user.doit_changer_mdp });
  } catch (e) {
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
