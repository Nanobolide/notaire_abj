import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT i.*, t.nom_tenant
       FROM saas_invoices i
       JOIN saas_tenants t ON t.id = i.tenant_id
       ORDER BY i.cree_le DESC`
    );
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    await exigerSuperAdmin();
    const d = await req.json();
    if (!d.tenant_id || !d.reference) return NextResponse.json({ erreur: "tenant_id et reference requis." }, { status: 400 });
    const vals = isPg()
      ? [d.tenant_id, d.subscription_id || null, d.reference, d.montant || 0, d.devise || "XOF", d.echeance_le || null]
      : [newId(), d.tenant_id, d.subscription_id || null, d.reference, d.montant || 0, d.devise || "XOF", d.echeance_le || null];
    const sql = isPg()
      ? `INSERT INTO saas_invoices (tenant_id, subscription_id, reference, montant, devise, echeance_le)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`
      : `INSERT INTO saas_invoices (id, tenant_id, subscription_id, reference, montant, devise, echeance_le)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const { rows } = await query(sql, vals);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
