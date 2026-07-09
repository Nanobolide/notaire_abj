import { NextResponse } from "next/server";
import { generateSecret, verify } from "otplib";
import { exigerSession } from "@/lib/auth";
import { withTenant, audit, securityEvent } from "@/lib/db";

export async function POST(req) {
  try {
    const s = await exigerSession();
    const { code } = await req.json().catch(() => ({}));
    const accountLabel = `${s.etudeNom || "NOTARIA"}:${s.nom || s.uid}`;
    if (!code) {
      const secret = generateSecret();
      await withTenant(s.etudeId, async (c) => {
        await c.query(`UPDATE utilisateurs SET mfa_secret = $1, mfa_active = false, mfa_method = 'totp' WHERE id = $2`, [secret, s.uid]);
        await securityEvent(c, {
          etudeId: s.etudeId, utilisateur: s.uid, typeEvenement: "auth.mfa_setup_initiated", details: { method: "totp" },
        });
      });
      const issuer = "NOTARIA";
      const label = encodeURIComponent(accountLabel);
      const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
      return NextResponse.json({ secret, otpauth, etape: "verification_requise" });
    }

    const user = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(`SELECT id, mfa_secret FROM utilisateurs WHERE id = $1`, [s.uid]);
      return rows[0];
    });
    if (!user?.mfa_secret)
      return NextResponse.json({ erreur: "Initialisez d'abord la configuration MFA." }, { status: 400 });
    const ok = verify({ token: String(code).trim(), secret: user.mfa_secret });
    if (!ok) {
      await withTenant(s.etudeId, (c) => securityEvent(c, {
        etudeId: s.etudeId, utilisateur: s.uid, typeEvenement: "auth.mfa_setup_failed", severite: "warning",
      }));
      return NextResponse.json({ erreur: "Code MFA invalide." }, { status: 400 });
    }
    await withTenant(s.etudeId, async (c) => {
      await c.query(`UPDATE utilisateurs SET mfa_active = true WHERE id = $1`, [s.uid]);
      await audit(c, {
        etudeId: s.etudeId, table: "utilisateurs", ligneId: s.uid, action: "modification",
        apres: { evenement: "mfa_activee", methode: "totp" }, utilisateur: s.uid,
      });
      await securityEvent(c, {
        etudeId: s.etudeId, utilisateur: s.uid, typeEvenement: "auth.mfa_enabled", details: { method: "totp" },
      });
    });
    return NextResponse.json({ ok: true, mfaActive: true });
  } catch (e) {
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
