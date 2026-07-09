import { NextResponse } from "next/server";
import { exigerSession, exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT st.*, t.nom_tenant
       FROM saas_support_tickets st
       LEFT JOIN saas_tenants t ON t.id = st.tenant_id
       ORDER BY st.cree_le DESC`
    );
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    const s = await exigerSession();
    const d = await req.json();
    if (!d.sujet || !d.description) return NextResponse.json({ erreur: "sujet et description requis." }, { status: 400 });
    let tenantId = d.tenant_id || null;
    if (!tenantId && s.role !== "super_admin") {
      const { rows } = await query(`SELECT id FROM saas_tenants WHERE etude_id = $1`, [s.etudeId]);
      tenantId = rows[0]?.id || null;
    }
    const vals = isPg()
      ? [tenantId, d.sujet.trim(), d.description.trim(), d.priorite || "normale", s.uid]
      : [newId(), tenantId, d.sujet.trim(), d.description.trim(), d.priorite || "normale", s.uid];
    const sql = isPg()
      ? `INSERT INTO saas_support_tickets (tenant_id, sujet, description, priorite, cree_par) VALUES ($1,$2,$3,$4,$5) RETURNING *`
      : `INSERT INTO saas_support_tickets (id, tenant_id, sujet, description, priorite, cree_par) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const { rows } = await query(sql, vals);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
