import { NextResponse } from "next/server";
import { exigerSession, exigerNotaire } from "@/lib/auth";
import pool from "@/lib/db";
import { reglage } from "@/lib/reglages";

/**
 * Offres immobilières entre études (« Proposition de vente / d'achat »).
 * Service ÉTEINT par défaut : il ne répond que si le super_admin l'a activé.
 * Garde-fou déontologique : une offre ne porte JAMAIS de donnée nominative du client.
 */

async function serviceActif() {
  return (await reglage("offres_actives", "false")) === "true";
}

/** Lire les offres visibles. Réservé aux études dont le forfait est autorisé (pro / pro_max). */
export async function GET() {
  try {
    const s = await exigerSession();
    if (!s.etudeId) return NextResponse.json({ actif: false, offres: [] });
    if (!(await serviceActif())) return NextResponse.json({ actif: false, offres: [] });
    // Le forfait de l'étude doit être pro ou pro_max.
    const { rows: [e] } = await pool.query(`SELECT forfait FROM etudes WHERE id = $1`, [s.etudeId]);
    const autorise = ["pro", "pro_max"].includes(e?.forfait);
    if (!autorise) return NextResponse.json({ actif: true, autorise: false, offres: [] });
    const { rows } = await pool.query(
      `SELECT id, type, titre, message, bien_ville, bien_prix, contact_etude, cree_le
       FROM annonces WHERE type IN ('proposition_vente','proposition_achat')
       ORDER BY cree_le DESC LIMIT 100`);
    return NextResponse.json({ actif: true, autorise: true, offres: rows });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Publier une offre. Réservé au Notaire d'une étude au forfait pro/pro_max, service actif. */
export async function POST(req) {
  try {
    const s = await exigerNotaire();
    if (!s.etudeId) { const e = new Error("Action réservée à une étude."); e.status = 403; throw e; }
    if (!(await serviceActif())) { const e = new Error("Le service d'offres n'est pas activé."); e.status = 403; throw e; }
    const { rows: [et] } = await pool.query(`SELECT forfait FROM etudes WHERE id = $1`, [s.etudeId]);
    if (!["pro", "pro_max"].includes(et?.forfait)) {
      const e = new Error("Votre forfait ne permet pas de publier des offres."); e.status = 403; throw e;
    }
    const { sens, titre, description, ville, prix, contact } = await req.json();
    if (!["vente", "achat"].includes(sens)) { const e = new Error("Type d'offre invalide."); e.status = 400; throw e; }
    if (!titre?.trim() || !ville?.trim()) { const e = new Error("Titre et ville obligatoires."); e.status = 400; throw e; }

    // Garde-fou déontologique : refuser toute apparence de donnée nominative du client.
    const suspect = /(monsieur|madame|m\.|mme|client|vendeur|acheteur)\s+[A-ZÉÈ][a-zéè]+/i;
    if (suspect.test(titre) || suspect.test(description || "") || suspect.test(contact || "")) {
      const e = new Error("Une offre ne doit contenir aucune donnée nominative du client (secret professionnel). Décrivez le bien, la ville et le prix, avec le contact de l'étude uniquement.");
      e.status = 400; throw e;
    }
    const type = sens === "vente" ? "proposition_vente" : "proposition_achat";
    await pool.query(
      `INSERT INTO annonces (titre, message, type, cible, bien_ville, bien_prix, contact_etude, cree_par)
       VALUES ($1,$2,$3,'toutes',$4,$5,$6,$7)`,
      [titre.trim(), (description || "").trim(), type, ville.trim(),
       prix ? Math.max(0, Math.round(Number(prix))) : null,
       (contact || "").trim() || null, s.uid]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
