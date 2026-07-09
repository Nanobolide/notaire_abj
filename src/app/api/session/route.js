import { NextResponse } from "next/server";
import { session } from "@/lib/auth";

/** Infos de la session courante pour l'interface (nom, rôle, obligation de changer le mdp). */
export async function GET() {
  const s = session();
  if (!s) return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  return NextResponse.json({ nom: s.nom, role: s.role, etudeNom: s.etudeNom || null, doitChangerMdp: !!s.doitChangerMdp, fonction: s.fonction || null,
    niveauAcces: s.niveauAcces || null, mfaEnabled: !!s.mfaEnabled, mfaLevel: s.mfaLevel || "none" });
}
