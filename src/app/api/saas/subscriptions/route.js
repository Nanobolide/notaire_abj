import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT s.*, t.nom_tenant, p.code AS plan_code
       FROM saas_subscriptions s
       JOIN saas_tenants t ON t.id = s.tenant_id
       JOIN saas_plans p ON p.id = s.plan_id
       ORDER BY s.cree_le DESC`
    );
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    await exigerSuperAdmin();
    const d = await req.json();
    if (!d.tenant_id || !d.plan_id) return NextResponse.json({ erreur: "tenant_id et plan_id requis." }, { status: 400 });
    const vals = isPg()
      ? [d.tenant_id, d.plan_id, d.periodicite || "mensuel", d.montant || 0, d.date_fin || null]
      : [newId(), d.tenant_id, d.plan_id, d.periodicite || "mensuel", d.montant || 0, d.date_fin || null];
    const sql = isPg()
      ? `INSERT INTO saas_subscriptions (tenant_id, plan_id, periodicite, montant, date_fin) VALUES ($1,$2,$3,$4,$5) RETURNING *`
      : `INSERT INTO saas_subscriptions (id, tenant_id, plan_id, periodicite, montant, date_fin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const { rows } = await query(sql, vals);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
