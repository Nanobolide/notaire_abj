import { NextResponse } from "next/server";
import { session, fermerSession } from "@/lib/auth";
import { deconnecterPresence } from "@/lib/db";

export async function POST() {
  const s = session();
  if (s) { try { await deconnecterPresence(s.uid); } catch {} }
  fermerSession();
  return NextResponse.json({ ok: true });
}
