import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { reglage } from "@/lib/reglages";

/** Annonces destinées à l'étude de la session (non lues d'abord). */
export async function GET() {
  try {
    const s = await exigerSession();
    if (!s.etudeId) return NextResponse.json([]);
    const visibles = await reglage("annonces_visibles_par", "tous");
    const n = s.niveauAcces || (s.role === "admin_etude" ? "administrateur" : "standard");
    if (visibles === "notaire" && !["administrateur", "notaire_salarie"].includes(n)) {
      return NextResponse.json([]);
    }
    const { rows } = await query(
      `SELECT a.id, a.titre, a.message, a.type, a.cree_le,
              (l.annonce_id IS NOT NULL) AS lu
       FROM annonces a
       LEFT JOIN annonce_lectures l ON l.annonce_id = a.id AND l.etude_id = $1
       WHERE a.type IN ('information','mise_a_jour','maintenance')
         AND (a.cible = 'toutes'
          OR (a.cible = 'forfait'   AND a.forfait_cible = (SELECT forfait FROM etudes WHERE id = $1))
          OR (a.cible = 'selection' AND EXISTS (SELECT 1 FROM annonce_etudes ae WHERE ae.annonce_id = a.id AND ae.etude_id = $1)))
       ORDER BY lu ASC, a.cree_le DESC`, [s.etudeId]);
    return NextResponse.json(rows.map((r) => ({ ...r, lu: !!r.lu })));
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Marquer une annonce comme lue pour l'étude. */
export async function POST(req) {
  try {
    const s = await exigerSession();
    if (!s.etudeId) return NextResponse.json({ ok: true });
    const { annonceId } = await req.json();
    if (!annonceId) { const e = new Error("Annonce non précisée."); e.status = 400; throw e; }
    const isPg = !!process.env.DATABASE_URL;
    if (isPg) {
      await query(`INSERT INTO annonce_lectures (annonce_id, etude_id) VALUES ($1,$2)
                   ON CONFLICT DO NOTHING`, [annonceId, s.etudeId]);
    } else {
      await query(`INSERT OR IGNORE INTO annonce_lectures (annonce_id, etude_id, lu_le)
                   VALUES ($1,$2,datetime('now'))`, [annonceId, s.etudeId]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
