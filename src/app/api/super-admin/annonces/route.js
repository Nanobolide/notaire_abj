import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import pool from "@/lib/db";

const TYPES = ["information", "mise_a_jour", "maintenance"];
const CIBLES = ["toutes", "selection", "forfait"];
const FORFAITS = ["ami", "essentiel", "pro", "pro_max"];

/** Liste des annonces émises. */
export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await pool.query(
      `SELECT a.*, (SELECT count(*) FROM annonce_lectures l WHERE l.annonce_id = a.id) AS lectures
       FROM annonces a ORDER BY a.cree_le DESC`);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Diffuser une annonce vers toutes les études, une sélection, ou un forfait. */
export async function POST(req) {
  try {
    const s = await exigerSuperAdmin();
    const { titre, message, type = "information", cible = "toutes", forfait_cible, etudes = [] } = await req.json();
    if (!titre?.trim() || !message?.trim()) { const e = new Error("Titre et message obligatoires."); e.status = 400; throw e; }
    if (!TYPES.includes(type)) { const e = new Error("Type inconnu."); e.status = 400; throw e; }
    if (!CIBLES.includes(cible)) { const e = new Error("Cible inconnue."); e.status = 400; throw e; }
    if (cible === "forfait" && !FORFAITS.includes(forfait_cible)) { const e = new Error("Forfait cible inconnu."); e.status = 400; throw e; }
    if (cible === "selection" && (!Array.isArray(etudes) || etudes.length === 0)) {
      const e = new Error("Sélectionnez au moins une étude."); e.status = 400; throw e;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: [a] } = await client.query(
        `INSERT INTO annonces (titre, message, type, cible, forfait_cible, cree_par)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [titre.trim(), message.trim(), type, cible, cible === "forfait" ? forfait_cible : null, s.uid]);
      if (cible === "selection") {
        for (const eid of etudes)
          await client.query(`INSERT INTO annonce_etudes (annonce_id, etude_id) VALUES ($1,$2)
                              ON CONFLICT DO NOTHING`, [a.id, eid]);
      }
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, id: a.id });
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
