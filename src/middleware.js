import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { loadJwtKeyConfig } from "@/lib/jwt-keys";

/**
 * Vérifie réellement la signature (runtime Edge, jose — jsonwebtoken n'y
 * fonctionne pas). Avant ce correctif, le middleware se contentait de
 * décoder le payload en base64 SANS vérifier la signature : les API
 * revérifiaient bien (aucune fuite de données), mais un cookie forgé
 * atteignait le shell des pages protégées, y compris /admin.
 */
async function verifierSession(token) {
  const { keys } = loadJwtKeyConfig();
  for (const secret of Object.values(keys)) {
    if (!secret) continue;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      return payload;
    } catch { /* essaie la clé suivante (rotation) */ }
  }
  return null;
}

/** Protège toutes les pages sauf la connexion et les routes publiques. */
export async function middleware(req) {
  const session = req.cookies.get("notaria_session");
  const { pathname } = req.nextUrl;
  const publique = pathname === "/connexion"
    || pathname === "/changer-mot-de-passe"
    || pathname === "/mot-de-passe-oublie"
    || pathname === "/mentions-legales"
    || pathname === "/api/health"
    || pathname.startsWith("/api/auth")
    || pathname === "/api/recuperation";

  const payload = session ? await verifierSession(session.value) : null;

  if (session && !payload) {
    // Cookie présent mais invalide/expiré/mal signé : traité comme non connecté.
    const res = publique ? NextResponse.next() : NextResponse.redirect(new URL("/connexion", req.url));
    res.cookies.delete("notaria_session");
    return res;
  }

  if (!payload && !publique)
    return NextResponse.redirect(new URL("/connexion", req.url));

  if (payload) {
    const doitChanger = payload.doitChangerMdp === true;
    const accueil = payload.role === "super_admin" ? "/admin" : "/tableau-de-bord";

    if (doitChanger && pathname !== "/changer-mot-de-passe" && !pathname.startsWith("/api/auth"))
      return NextResponse.redirect(new URL("/changer-mot-de-passe", req.url));

    if (!doitChanger && pathname === "/changer-mot-de-passe")
      return NextResponse.redirect(new URL(accueil, req.url));

    if (pathname === "/connexion")
      return NextResponse.redirect(new URL(accueil, req.url));

    if (payload.role !== "super_admin" && pathname.startsWith("/admin"))
      return NextResponse.redirect(new URL("/tableau-de-bord", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
