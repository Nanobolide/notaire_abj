import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const s = await exigerSession();
    const rows = await withTenant(s.etudeId, async (c) =>
      (await c.query(
        `SELECT p.texte, p.horodatage, u.nom_affiche AS auteur
         FROM pieces_log p LEFT JOIN utilisateurs u ON u.id = p.auteur
         WHERE p.acte_id = $1 ORDER BY p.horodatage ASC`, [params.id])).rows);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Ajout d'une entrée au journal — rien ne se modifie ni ne s'efface jamais. */
export async function POST(req, { params }) {
  try {
    const s = await exigerSession();
    const { texte } = await req.json();
    if (!texte?.trim())
      return NextResponse.json({ erreur: "Le texte de l'entrée est vide." }, { status: 400 });
    const ligne = await withTenant(s.etudeId, async (c) =>
      (await c.query(
        `INSERT INTO pieces_log (etude_id, acte_id, texte, auteur)
         VALUES ($1,$2,$3,$4) RETURNING texte, horodatage`,
        [s.etudeId, params.id, texte.trim(), s.uid])).rows[0]);
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
