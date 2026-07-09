import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";
import { nowSql } from "@/app/api/saas/_utils";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(`SELECT * FROM saas_plans ORDER BY cree_le DESC`);
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function POST(req) {
  try {
    const s = await exigerSuperAdmin();
    const d = await req.json();
    if (!d.code || !d.nom) return NextResponse.json({ erreur: "code et nom requis." }, { status: 400 });
    const vals = isPg()
      ? [d.code.trim(), d.nom.trim(), d.prix_mensuel || 0, d.prix_annuel || 0, d.max_utilisateurs || 10, d.max_stockage_go || 10]
      : [newId(), d.code.trim(), d.nom.trim(), d.prix_mensuel || 0, d.prix_annuel || 0, d.max_utilisateurs || 10, d.max_stockage_go || 10];
    const sql = isPg()
      ? `INSERT INTO saas_plans (code, nom, prix_mensuel, prix_annuel, max_utilisateurs, max_stockage_go)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`
      : `INSERT INTO saas_plans (id, code, nom, prix_mensuel, prix_annuel, max_utilisateurs, max_stockage_go)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const { rows } = await query(sql, vals);
    await query(
      `INSERT INTO security_events (id, etude_id, utilisateur, type_evenement, severite, details)
       VALUES (${isPg() ? "gen_random_uuid()" : "$1"}, NULL, $2, 'saas.plan_created', 'info', $3)`,
      isPg() ? [s.uid, JSON.stringify({ code: d.code })] : [newId(), s.uid, JSON.stringify({ code: d.code })]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
