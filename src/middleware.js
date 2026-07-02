import { NextResponse } from "next/server";

/** Protège toutes les pages sauf la connexion et les routes publiques. */
export function middleware(req) {
  const session = req.cookies.get("notaria_session");
  const { pathname } = req.nextUrl;
  const publique = pathname === "/connexion" || pathname.startsWith("/api/auth");
  if (!session && !publique)
    return NextResponse.redirect(new URL("/connexion", req.url));
  if (session && pathname === "/connexion")
    return NextResponse.redirect(new URL("/tableau-de-bord", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
