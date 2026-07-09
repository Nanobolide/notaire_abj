import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { pool } from "@/lib/db";

const CATEGORIES = ["Amélioration", "Difficulté rencontrée", "Erreur / bug", "Autre"];

/** C16 — avis anonyme : aucune reference utilisateur ni etude. */
export async function POST(req) {
  try {
    const s = await exigerSession();
    const { categorie, message, fonction } = await req.json();
    if (!message?.trim() || message.trim().length < 10)
      return NextResponse.json({ erreur: "Écrivez au moins une phrase (10 caractères)." }, { status: 400 });
    if (message.length > 4000)
      return NextResponse.json({ erreur: "Message trop long (4000 caractères maximum)." }, { status: 400 });
    if (categorie && !CATEGORIES.includes(categorie))
      return NextResponse.json({ erreur: "Catégorie inconnue." }, { status: 400 });

    const fonctionDeclaree = typeof fonction === "string" && fonction.trim() ? fonction.trim() : null;
    await pool.query(
      `INSERT INTO avis (fonction, categorie, message) VALUES ($1, $2, $3)`,
      [fonctionDeclaree, categorie || "Amélioration", message.trim()]);

    return NextResponse.json({ ok: true,
      message: "Merci. Votre avis nous est parvenu de façon anonyme." });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
