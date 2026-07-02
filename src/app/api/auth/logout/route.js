import { NextResponse } from "next/server";
import { fermerSession } from "@/lib/auth";
export async function POST() { fermerSession(); return NextResponse.json({ ok: true }); }
