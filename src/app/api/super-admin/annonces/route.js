import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, withTransaction, newId } from "@/lib/db";

const TYPES = ["information", "mise_a_jour", "maintenance"];
const CIBLES = ["toutes", "selection", "forfait"];
const FORFAITS = ["ami", "essentiel", "pro", "pro_max"];

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT a.*, (SELECT count(*) FROM annonce_lectures l WHERE l.annonce_id = a.id) AS lectures
       FROM annonces a ORDER BY a.cree_le DESC`);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

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
    const isPg = !!process.env.DATABASE_URL;
    const id = await withTransaction(async (c) => {
      let annonceId;
      if (isPg) {
        const { rows: [a] } = await c.query(
          `INSERT INTO annonces (titre, message, type, cible, forfait_cible, cree_par)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [titre.trim(), message.trim(), type, cible, cible === "forfait" ? forfait_cible : null, s.uid]);
        annonceId = a.id;
      } else {
        annonceId = newId();
        await c.query(
          `INSERT INTO annonces (id, titre, message, type, cible, forfait_cible, cree_par)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [annonceId, titre.trim(), message.trim(), type, cible, cible === "forfait" ? forfait_cible : null, s.uid]);
      }
      if (cible === "selection") {
        for (const eid of etudes) {
          if (isPg) {
            await c.query(`INSERT INTO annonce_etudes (annonce_id, etude_id) VALUES ($1,$2)
                           ON CONFLICT DO NOTHING`, [annonceId, eid]);
          } else {
            await c.query(`INSERT OR IGNORE INTO annonce_etudes (annonce_id, etude_id) VALUES ($1,$2)`,
              [annonceId, eid]);
          }
        }
      }
      return annonceId;
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
