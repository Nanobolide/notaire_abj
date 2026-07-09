import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT l.*, t.nom_tenant
       FROM saas_licenses l
       JOIN saas_tenants t ON t.id = l.tenant_id
       ORDER BY l.cree_le DESC`
    );
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    await exigerSuperAdmin();
    const d = await req.json();
    if (!d.tenant_id) return NextResponse.json({ erreur: "tenant_id requis." }, { status: 400 });
    const cle = d.cle_licence || `NTR-${randomUUID().slice(0, 8).toUpperCase()}`;
    const vals = isPg()
      ? [d.tenant_id, cle, d.quota_utilisateurs || 10, d.quota_stockage_go || 10, d.expire_le || null]
      : [newId(), d.tenant_id, cle, d.quota_utilisateurs || 10, d.quota_stockage_go || 10, d.expire_le || null];
    const sql = isPg()
      ? `INSERT INTO saas_licenses (tenant_id, cle_licence, quota_utilisateurs, quota_stockage_go, expire_le) VALUES ($1,$2,$3,$4,$5) RETURNING *`
      : `INSERT INTO saas_licenses (id, tenant_id, cle_licence, quota_utilisateurs, quota_stockage_go, expire_le) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const { rows } = await query(sql, vals);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
