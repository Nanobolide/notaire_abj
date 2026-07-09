import { NextResponse } from "next/server";
import { verify } from "otplib";
import { exigerSession, creerSession } from "@/lib/auth";
import { withTenant, securityEvent } from "@/lib/db";

export async function POST(req) {
  try {
    const s = await exigerSession();
    const { code } = await req.json();
    if (!code) return NextResponse.json({ erreur: "Code MFA requis." }, { status: 400 });

    const user = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(
        `SELECT u.id, u.etude_id, u.role, u.nom_affiche, u.fonction, u.niveau_acces, u.doit_changer_mdp,
                u.mfa_active, u.mfa_secret, e.nom AS etude_nom
         FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
         WHERE u.id = $1`,
        [s.uid]
      );
      return rows[0];
    });
    if (!user?.mfa_active) return NextResponse.json({ erreur: "MFA non activé." }, { status: 400 });

    const ok = verify({ token: String(code).trim(), secret: user.mfa_secret });
    if (!ok) {
      await withTenant(s.etudeId, (c) => securityEvent(c, {
        etudeId: s.etudeId, utilisateur: s.uid, typeEvenement: "auth.stepup_failed", severite: "warning",
      }));
      return NextResponse.json({ erreur: "Code MFA invalide." }, { status: 401 });
    }

    creerSession(user, { mfaLevel: "stepup" });
    await withTenant(s.etudeId, (c) => securityEvent(c, {
      etudeId: s.etudeId, utilisateur: s.uid, typeEvenement: "auth.stepup_success",
    }));
    return NextResponse.json({ ok: true, niveau: "stepup" });
  } catch (e) {
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
