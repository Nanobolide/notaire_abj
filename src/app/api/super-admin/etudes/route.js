import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

const FORFAITS = ["ami", "essentiel", "pro", "pro_max"];

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT e.id, e.nom, e.adresse, e.statut, e.forfait, e.cree_le,
              (SELECT count(*) FROM utilisateurs u WHERE u.etude_id = e.id AND u.role <> 'super_admin') AS comptes
       FROM etudes e ORDER BY e.cree_le`);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function PATCH(req) {
  try {
    await exigerSuperAdmin();
    const { etudeId, forfait, statut } = await req.json();
    if (!etudeId) { const e = new Error("Étude non précisée."); e.status = 400; throw e; }
    if (forfait && !FORFAITS.includes(forfait)) { const e = new Error("Forfait inconnu."); e.status = 400; throw e; }
    if (statut && !["active", "desactivee"].includes(statut)) { const e = new Error("Statut inconnu."); e.status = 400; throw e; }
    if (forfait) await query(`UPDATE etudes SET forfait = $1 WHERE id = $2`, [forfait, etudeId]);
    if (statut) await query(`UPDATE etudes SET statut = $1 WHERE id = $2`, [statut, etudeId]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
