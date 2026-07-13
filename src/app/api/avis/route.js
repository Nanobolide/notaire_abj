import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { pool } from "@/lib/db";

const CATEGORIES = ["Amélioration", "Difficulté rencontrée", "Erreur / bug", "Autre"];

/**
 * N°28 — Recueil d'un avis. ANONYME PAR CONSTRUCTION.
 * On exige une session (pour éviter les envois automatisés), mais on n'écrit NI l'identifiant
 * de l'utilisateur, NI celui de son étude. Seule la fonction est conservée. Aucune requête,
 * même en base, ne permet de remonter à l'auteur.
 */
export async function POST(req) {
  try {
    const s = await exigerSession();           // authentifié…
    const { categorie, message, fonction } = await req.json();
    if (!message?.trim() || message.trim().length < 10)
      return NextResponse.json({ erreur: "Écrivez au moins une phrase (10 caractères)." }, { status: 400 });
    if (message.length > 4000)
      return NextResponse.json({ erreur: "Message trop long (4000 caractères maximum)." }, { status: 400 });
    if (categorie && !CATEGORIES.includes(categorie))
      return NextResponse.json({ erreur: "Catégorie inconnue." }, { status: 400 });

    // C16 — …et on n'enregistre RIEN qui permette d'identifier la personne.
    // La fonction n'est conservée QUE si l'auteur l'a lui-même déclarée. S'il a choisi
    // « Je préfère ne pas le dire », on n'écrit rien : JAMAIS de repli sur s.fonction.
    // Dans une petite étude, une seule personne est comptable — enregistrer sa fonction
    // contre sa volonté reviendrait à la désigner.
    const fonctionDeclaree = typeof fonction === "string" && fonction.trim() ? fonction.trim() : null;
    await pool.query(
      `INSERT INTO avis (fonction, categorie, message) VALUES ($1, $2, $3)`,
      [fonctionDeclaree, categorie || "Amélioration", message.trim()]);

    return NextResponse.json({ ok: true,
      message: "Merci. Votre avis nous est parvenu de façon anonyme." });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
