import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { exigerSession, exigerStepUp } from "@/lib/auth";
import { withTenant, audit, securityEvent } from "@/lib/db";

export async function POST(req) {
  try {
    const s = await exigerSession();
    await exigerStepUp();
    const { motDePasse } = await req.json();
    if (!motDePasse) return NextResponse.json({ erreur: "Mot de passe requis." }, { status: 400 });

    await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(`SELECT hash_mot_de_passe FROM utilisateurs WHERE id = $1`, [s.uid]);
      const ok = await bcrypt.compare(motDePasse, rows[0]?.hash_mot_de_passe || "");
      if (!ok) {
        const e = new Error("Mot de passe incorrect.");
        e.status = 401;
        throw e;
      }
      await c.query(`UPDATE utilisateurs SET mfa_active = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1`, [s.uid]);
      await audit(c, {
        etudeId: s.etudeId, table: "utilisateurs", ligneId: s.uid, action: "modification",
        apres: { evenement: "mfa_desactivee" }, utilisateur: s.uid,
      });
      await securityEvent(c, { etudeId: s.etudeId, utilisateur: s.uid, typeEvenement: "auth.mfa_disabled", severite: "warning" });
    });
    return NextResponse.json({ ok: true, mfaActive: false });
  } catch (e) {
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
