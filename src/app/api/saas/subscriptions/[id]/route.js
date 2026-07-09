import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { nowSql } from "@/app/api/saas/_utils";

export async function PATCH(req, { params }) {
  try {
    await exigerSuperAdmin();
    const d = await req.json();
    const fields = ["plan_id", "periodicite", "statut", "montant", "date_fin"];
    const sets = [];
    const vals = [];
    for (const f of fields) if (f in d) { vals.push(d[f]); sets.push(`${f} = $${vals.length}`); }
    if (!sets.length) return NextResponse.json({ erreur: "Aucune modification." }, { status: 400 });
    vals.push(params.id);
    const { rows } = await query(
      `UPDATE saas_subscriptions SET ${sets.join(", ")}, modifie_le = ${nowSql()} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return NextResponse.json({ erreur: "Abonnement introuvable." }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
