import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { verifierCompteActif } from "@/lib/db";

const COOKIE = "notaria_session";
const DUREE_SESSION = 60 * 30; // 30 min — postes partagés à l'accueil

export function creerSession(user) {
  const token = jwt.sign(
    { uid: user.id, etudeId: user.etude_id, role: user.role, nom: user.nom_affiche,
      etudeNom: user.etude_nom || null, fonction: user.fonction || null, doitChangerMdp: !!user.doit_changer_mdp },
    process.env.JWT_SECRET,
    { expiresIn: DUREE_SESSION }
  );
  cookies().set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: DUREE_SESSION,
    secure: process.env.NODE_ENV === "production",
  });
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

export async function exigerSession(permettreMdpProvisoire = false) {
  const s = session();
  if (!s) { const e = new Error("Non authentifié"); e.status = 401; throw e; }
  // C7 — révocation immédiate : compte désactivé/verrouillé => accès coupé sur-le-champ.
  const actif = await verifierCompteActif(s.uid);
  if (!actif) { const e = new Error("Votre accès a été suspendu. Contactez le Notaire de l'étude."); e.status = 403; throw e; }
  // C1 — blocage tant que le mot de passe provisoire n'est pas changé.
  if (s.doitChangerMdp && !permettreMdpProvisoire) {
    const e = new Error("Vous devez d'abord changer votre mot de passe (première connexion).");
    e.status = 403; throw e;
  }
  return s;
}

export async function exigerAdmin() {
  const s = await exigerSession();
  if (s.role !== "admin_etude" && s.role !== "super_admin") {
    const e = new Error("Réservé à l'Administrateur d'étude"); e.status = 403; throw e;
  }
  return s;
}

export function estAdmin(s) {
  return s && (s.role === "admin_etude" || s.role === "super_admin");
}
