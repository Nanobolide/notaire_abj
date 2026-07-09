import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";
import { nowSql } from "@/app/api/saas/_utils";

export async function PATCH(req, { params }) {
  try {
    const s = await exigerSuperAdmin();
    const d = await req.json();
    const fields = ["statut", "priorite", "assigne_a"];
    const sets = [];
    const vals = [];
    for (const f of fields) if (f in d) { vals.push(d[f]); sets.push(`${f} = $${vals.length}`); }
    if (!sets.length) return NextResponse.json({ erreur: "Aucune modification." }, { status: 400 });
    vals.push(params.id);
    const { rows } = await query(
      `UPDATE saas_support_tickets SET ${sets.join(", ")}, modifie_le = ${nowSql()} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return NextResponse.json({ erreur: "Ticket introuvable." }, { status: 404 });
    if (isPg()) {
      await query(
        `INSERT INTO security_events (etude_id, utilisateur, type_evenement, severite, details)
         VALUES (NULL, $1, 'saas.support_updated', 'info', $2)`,
        [s.uid, JSON.stringify({ ticketId: params.id, statut: d.statut || null })]
      );
    } else {
      await query(
        `INSERT INTO security_events (id, etude_id, utilisateur, type_evenement, severite, details)
         VALUES ($1, NULL, $2, 'saas.support_updated', 'info', $3)`,
        [newId(), s.uid, JSON.stringify({ ticketId: params.id, statut: d.statut || null })]
      );
    }
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: 500 }); }
}
