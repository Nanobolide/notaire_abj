import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { nowSql } from "@/app/api/saas/_utils";

const STATUT_ETUDE = { actif: "active", suspendu: "desactivee", resilie: "desactivee" };

export async function PATCH(req, { params }) {
  try {
    await exigerSuperAdmin();
    const d = await req.json();
    const fields = ["nom_tenant", "contact_nom", "contact_email", "statut"];
    const sets = [];
    const vals = [];
    for (const f of fields) if (f in d) { vals.push(d[f]); sets.push(`${f} = $${vals.length}`); }
    if (!sets.length) return NextResponse.json({ erreur: "Aucune modification." }, { status: 400 });
    vals.push(params.id);
    const { rows } = await query(
      `UPDATE saas_tenants SET ${sets.join(", ")}, modifie_le = ${nowSql()} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return NextResponse.json({ erreur: "Tenant introuvable." }, { status: 404 });
    // Le statut du tenant commande l'accès réel de l'étude (bascule active/désactivée).
    if ("statut" in d && rows[0].etude_id && STATUT_ETUDE[d.statut]) {
      await query(`UPDATE etudes SET statut = $1 WHERE id = $2`, [STATUT_ETUDE[d.statut], rows[0].etude_id]);
    }
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
