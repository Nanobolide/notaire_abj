import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { isPg } from "@/lib/dialect";
import { asJson, nowSql } from "@/app/api/saas/_utils";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(`SELECT * FROM saas_global_settings ORDER BY cle`);
    const out = {};
    for (const r of rows) out[r.cle] = asJson(r.valeur);
    return NextResponse.json(out);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

export async function PATCH(req) {
  try {
    const s = await exigerSuperAdmin();
    const d = await req.json();
    const entries = Object.entries(d || {});
    if (!entries.length) return NextResponse.json({ erreur: "Aucune clé fournie." }, { status: 400 });
    for (const [cle, valeur] of entries) {
      if (isPg()) {
        await query(
          `INSERT INTO saas_global_settings (cle, valeur, modifie_par)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, modifie_par = EXCLUDED.modifie_par, modifie_le = ${nowSql()}`,
          [cle, JSON.stringify(valeur), s.uid]
        );
      } else {
        await query(
          `INSERT INTO saas_global_settings (cle, valeur, modifie_par, modifie_le)
           VALUES ($1, $2, $3, ${nowSql()})
           ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, modifie_par = excluded.modifie_par, modifie_le = ${nowSql()}`,
          [cle, JSON.stringify(valeur), s.uid]
        );
      }
    }
    return NextResponse.json({ ok: true, total: entries.length });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
