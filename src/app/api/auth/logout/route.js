import { NextResponse } from "next/server";
import { session, fermerSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST() {
  // Marquer immédiatement hors ligne (sinon la présence resterait "en ligne" jusqu'à 5 min)
  const s = session();
  if (s) { try { await pool.query(`SELECT deconnecter_presence($1)`, [s.uid]); } catch {} }
  fermerSession();
  return NextResponse.json({ ok: true });
}
