import { NextResponse } from "next/server";

function decodePayload(token) {
  try {
    const b64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

/** Protège toutes les pages sauf la connexion et les routes publiques. */
export function middleware(req) {
  const session = req.cookies.get("notaria_session");
  const { pathname } = req.nextUrl;
  const publique = pathname === "/connexion"
    || pathname === "/changer-mot-de-passe"
    || pathname === "/mot-de-passe-oublie"
    || pathname === "/mentions-legales"
    || pathname === "/api/health"
    || pathname.startsWith("/api/auth")
    || pathname === "/api/recuperation";

  if (!session && !publique)
    return NextResponse.redirect(new URL("/connexion", req.url));

  if (session) {
    const payload = decodePayload(session.value);
    const doitChanger = payload?.doitChangerMdp === true;

    if (doitChanger && pathname !== "/changer-mot-de-passe" && !pathname.startsWith("/api/auth"))
      return NextResponse.redirect(new URL("/changer-mot-de-passe", req.url));

    if (!doitChanger && pathname === "/changer-mot-de-passe")
      return NextResponse.redirect(new URL("/tableau-de-bord", req.url));

    if (pathname === "/connexion")
      return NextResponse.redirect(new URL("/tableau-de-bord", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
