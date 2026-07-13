import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import pool from "@/lib/db";

const CLES = {
  offres_actives: ["true", "false"],
  forfaits_restrictions_actives: ["true", "false"],
  annonces_visibles_par: ["tous", "notaire"],
};

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await pool.query(`SELECT cle, valeur FROM reglages_plateforme`);
    const out = {};
    for (const r of rows) out[r.cle] = r.valeur;
    return NextResponse.json(out);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function PATCH(req) {
  try {
    await exigerSuperAdmin();
    const { cle, valeur } = await req.json();
    if (!CLES[cle]) { const e = new Error("Réglage inconnu."); e.status = 400; throw e; }
    if (!CLES[cle].includes(String(valeur))) { const e = new Error("Valeur non autorisée."); e.status = 400; throw e; }
    await pool.query(
      `INSERT INTO reglages_plateforme (cle, valeur, maj_le) VALUES ($1,$2,now())
       ON CONFLICT (cle) DO UPDATE SET valeur = $2, maj_le = now()`, [cle, String(valeur)]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
