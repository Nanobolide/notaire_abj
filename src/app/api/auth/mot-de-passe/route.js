import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { exigerSession, creerSession } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";

export async function POST(req) {
  try {
    const s = await exigerSession(true); // accessible avec un mot de passe provisoire
    const { actuel, nouveau } = await req.json();
    if (!actuel || !nouveau)
      return NextResponse.json({ erreur: "Mot de passe actuel et nouveau requis." }, { status: 400 });
    if (nouveau.length < 10 || !/[A-Za-z]/.test(nouveau) || !/[0-9]/.test(nouveau))
      return NextResponse.json({ erreur: "Le nouveau mot de passe doit faire au moins 10 caractères et contenir lettres et chiffres." }, { status: 400 });
    if (nouveau === actuel)
      return NextResponse.json({ erreur: "Le nouveau mot de passe doit être différent de l'actuel." }, { status: 400 });

    const user = await withTenant(s.etudeId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM utilisateurs WHERE id = $1`, [s.uid]);
      const u = rows[0];
      if (!u) { const e = new Error("Compte introuvable"); e.status = 404; throw e; }
      const ok = await bcrypt.compare(actuel, u.hash_mot_de_passe);
      if (!ok) { const e = new Error("Mot de passe actuel incorrect."); e.status = 401; throw e; }
      const hash = await bcrypt.hash(nouveau, 10);
      const { rows: maj } = await c.query(
        `UPDATE utilisateurs SET hash_mot_de_passe = $1, doit_changer_mdp = false WHERE id = $2 RETURNING *`,
        [hash, s.uid]);
      await audit(c, { etudeId: s.etudeId, table: "utilisateurs", ligneId: s.uid,
        action: "modification", apres: { evenement: "changement_mot_de_passe" }, utilisateur: s.uid });
      return maj[0];
    });
    creerSession(user); // nouvelle session sans l'obligation
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
