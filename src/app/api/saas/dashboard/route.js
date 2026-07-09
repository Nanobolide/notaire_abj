import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const [{ rows: t }, { rows: s }, { rows: i }, { rows: sup }] = await Promise.all([
      query(`SELECT count(*) AS total_tenants,
                    COALESCE(sum(case when statut = 'actif' then 1 else 0 end),0) AS actifs
             FROM saas_tenants`),
      query(`SELECT count(*) AS total_subscriptions,
                    COALESCE(sum(case when statut = 'active' then 1 else 0 end),0) AS subscriptions_actives
             FROM saas_subscriptions`),
      query(`SELECT count(*) AS total_invoices,
                    COALESCE(sum(case when statut = 'payee' then montant else 0 end),0) AS revenus_payes
             FROM saas_invoices`),
      query(`SELECT count(*) AS tickets_ouverts FROM saas_support_tickets WHERE statut IN ('ouvert','en_cours')`),
    ]);
    return NextResponse.json({
      tenants: t[0] || { total_tenants: 0, actifs: 0 },
      subscriptions: s[0] || { total_subscriptions: 0, subscriptions_actives: 0 },
      invoices: i[0] || { total_invoices: 0, revenus_payes: 0 },
      support: sup[0] || { tickets_ouverts: 0 },
    });
  } catch (e) {
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
