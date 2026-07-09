import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Le Notaire qui a oublié son mot de passe déclenche une demande de récupération.
 * Aucune donnée n'est modifiée : on enregistre seulement la demande. La réinitialisation
 * effective est faite par le Super-Admin (l'équipe technique) après confirmation
 * de vive voix — pour qu'un simple accès au téléphone du Notaire ne suffise pas.
 */
export async function POST(req) {
  try {
    const { identifiant } = await req.json();
    if (!identifiant?.trim())
      return NextResponse.json({ erreur: "Indiquez votre identifiant." }, { status: 400 });
    // On ne révèle jamais si l'identifiant existe (anti-énumération).
    const { rows } = await pool.query(
      `SELECT id, etude_id, role FROM utilisateurs WHERE identifiant = $1`, [identifiant.trim()]);
    const u = rows[0];
    if (u && u.role === "admin_etude") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query(
        `INSERT INTO demandes_recuperation (etude_id, identifiant, code_confirmation)
         VALUES ($1, $2, $3)`, [u.etude_id, identifiant.trim(), code]);
    }
    return NextResponse.json({ ok: true,
      message: "Si ce compte est éligible, une demande a été transmise à l'équipe technique. " +
               "Contactez votre support NOTARIA pour confirmer votre identité et recevoir un mot de passe provisoire." });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
