import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { withTenant, newId } from "@/lib/db";
import { isPg, sqlPiecesInsert } from "@/lib/dialect";

export async function GET(req, { params }) {
  try {
    const s = exigerSession();
    const rows = await withTenant(s.etudeId, async (c) =>
      (await c.query(
        `SELECT p.texte, p.horodatage, u.nom_affiche AS auteur
         FROM pieces_log p LEFT JOIN utilisateurs u ON u.id = p.auteur
         WHERE p.acte_id = $1 AND p.etude_id = $2 ORDER BY p.horodatage ASC`,
        [params.id, s.etudeId]
      )).rows);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req, { params }) {
  try {
    const s = exigerSession();
    const { texte } = await req.json();
    if (!texte?.trim())
      return NextResponse.json({ erreur: "Le texte de l'entrée est vide." }, { status: 400 });
    const ligne = await withTenant(s.etudeId, async (c) => {
      const paramsSql = isPg()
        ? [s.etudeId, params.id, texte.trim(), s.uid]
        : [newId(), s.etudeId, params.id, texte.trim(), s.uid];
      return (await c.query(sqlPiecesInsert(), paramsSql)).rows[0];
    });
    return NextResponse.json(ligne, { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
