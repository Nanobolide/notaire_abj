import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

/** Sonde Render — vérifie que l'API et la base répondent. */
export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      await db.query("SELECT 1 AS ok");
    }
    return NextResponse.json({
      statut: "ok",
      base: process.env.DATABASE_URL ? "postgresql" : "sqlite",
    });
  } catch (e) {
    return NextResponse.json({ statut: "erreur", message: e.message }, { status: 503 });
  }
}
