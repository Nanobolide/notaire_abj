import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(`SELECT * FROM saas_notifications ORDER BY cree_le DESC`);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    await exigerSuperAdmin();
    const d = await req.json();
    if (!d.message) return NextResponse.json({ erreur: "message requis." }, { status: 400 });
    const vals = isPg()
      ? [d.tenant_id || null, d.canal || "in_app", d.cible || null, d.sujet || null, d.message]
      : [newId(), d.tenant_id || null, d.canal || "in_app", d.cible || null, d.sujet || null, d.message];
    const sql = isPg()
      ? `INSERT INTO saas_notifications (tenant_id, canal, cible, sujet, message) VALUES ($1,$2,$3,$4,$5) RETURNING *`
      : `INSERT INTO saas_notifications (id, tenant_id, canal, cible, sujet, message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const { rows } = await query(sql, vals);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
