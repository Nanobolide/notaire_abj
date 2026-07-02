import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE = "notaria_session";
const DUREE_SESSION = 60 * 30; // 30 min — postes partagés à l'accueil

export function creerSession(user) {
  const token = jwt.sign(
    { uid: user.id, etudeId: user.etude_id, role: user.role, nom: user.nom_affiche },
    process.env.JWT_SECRET,
    { expiresIn: DUREE_SESSION }
  );
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: DUREE_SESSION });
}

export function fermerSession() {
  cookies().delete(COOKIE);
}

/** Retourne la session courante ou null. À appeler dans chaque route API. */
export function session() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export function exigerSession() {
  const s = session();
  if (!s) { const e = new Error("Non authentifié"); e.status = 401; throw e; }
  return s;
}

export function exigerAdmin() {
  const s = exigerSession();
  if (s.role !== "admin_etude" && s.role !== "super_admin") {
    const e = new Error("Réservé à l'Administrateur d'étude"); e.status = 403; throw e;
  }
  return s;
}
