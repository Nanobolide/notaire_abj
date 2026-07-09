import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";

/**
 * Guard unifie V3 pour endpoints JSON:
 * - authentification
 * - autorisation (callback)
 * - format d'erreur standard
 */
export async function withApiGuard({ allowProvisionalPassword = false, authorize, run }) {
  try {
    const session = await exigerSession(allowProvisionalPassword);
    if (authorize && !authorize(session)) {
      const e = new Error("Accès refusé.");
      e.status = 403;
      throw e;
    }
    const out = await run(session);
    if (out instanceof Response) return out;
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
