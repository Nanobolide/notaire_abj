import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { etatCompte } from "@/lib/db";

const COOKIE = "notaria_session";
const DUREE_SESSION = 60 * 30; // 30 min — postes partagés à l'accueil

export function creerSession(user) {
  const token = jwt.sign(
    { uid: user.id, etudeId: user.etude_id, role: user.role, nom: user.nom_affiche,
      etudeNom: user.etude_nom || null, fonction: user.fonction || null,
        niveauAcces: user.niveau_acces || (user.role === 'admin_etude' ? 'administrateur' : 'standard'),
        doitChangerMdp: !!user.doit_changer_mdp },
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

export async function exigerSession(permettreMdpProvisoire = false) {
  const s = session();
  if (!s) { const e = new Error("Non authentifié"); e.status = 401; throw e; }
  // C7 + C14 — état courant lu en base : compte suspendu => 403 ; niveau d'accès rafraîchi.
  const etat = await etatCompte(s.uid);
  if (!etat) { const e = new Error("Votre accès a été suspendu. Contactez le Notaire de l'étude."); e.status = 403; throw e; }
  s.niveauAcces = etat.niveauAcces;   // le jeton ne fait plus autorité
  s.fonction = etat.fonction;
  // C1 — blocage tant que le mot de passe provisoire n'est pas changé.
  if (s.doitChangerMdp && !permettreMdpProvisoire) {
    const e = new Error("Vous devez d'abord changer votre mot de passe (première connexion).");
    e.status = 403; throw e;
  }
  return s;
}

/**
 * C9 — L'autorisation se fonde sur niveau_acces, JAMAIS sur role.
 * exigerNotaire() : Administrateur + Notaire salarié (lecture/écriture métier complète).
 */
export async function exigerNotaire() {
  const s = await exigerSession();
  const n = s.niveauAcces || (s.role === "admin_etude" ? "administrateur" : "standard");
  if (s.role !== "super_admin" && !["administrateur", "notaire_salarie"].includes(n)) {
    const e = new Error("Réservé au Notaire de l'étude"); e.status = 403; throw e;
  }
  return s;
}

/**
 * exigerSuperAdmin() : réservé à l'éditeur (Anthropic / vous). C'est le SEUL endroit où
 * le critère légitime est `role`, car le super_admin n'est pas un rôle d'étude mais l'exploitant
 * de la plateforme. Toute autre autorisation continue de passer par niveau_acces (voir C9).
 */
export async function exigerSuperAdmin() {
  const s = await exigerSession();
  if (s.role !== "super_admin") {
    const e = new Error("Réservé au Super Administrateur de la plateforme"); e.status = 403; throw e;
  }
  return s;
}

/** exigerAdmin() : Administrateur SEUL (comptes, paramètres, suppression, démo). */
export async function exigerAdmin() {
  const s = await exigerSession();
  const n = s.niveauAcces || (s.role === "admin_etude" ? "administrateur" : "standard");
  if (s.role !== "super_admin" && n !== "administrateur") {
    const e = new Error("Réservé à l'Administrateur de l'étude"); e.status = 403; throw e;
  }
  return s;
}

/**
 * I9 — SUPPRIMÉ. estAdmin() se fondait sur `role` et a causé la faille C9
 * (le Notaire salarié, de role 'admin_etude', obtenait les droits d'Administrateur).
 * L'autorisation passe désormais EXCLUSIVEMENT par src/lib/acces.js, qui lit `niveau_acces`.
 * N'introduisez pas de nouveau contrôle fondé sur `role`.
 */
