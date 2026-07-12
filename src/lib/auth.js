import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { etatCompte } from "@/lib/db";
import { loadJwtKeyConfig } from "@/lib/jwt-keys";

const COOKIE = "notaria_session";
const DUREE_SESSION = 60 * 30; // 30 min glissantes — postes partagés à l'accueil
// Plafond ABSOLU depuis la connexion initiale, même en cas d'activité continue :
// une session ne peut jamais dépasser cette durée, glissement inclus.
const DUREE_MAX_ABSOLUE = 60 * 60 * 4; // 4h
const DEFAULT_STEPUP_WINDOW_MINUTES = 15;

function signWithActiveKey(payload, expiresIn) {
  const { activeKid, keys } = loadJwtKeyConfig();
  const secret = keys[activeKid];
  return jwt.sign(payload, secret, { expiresIn, keyid: activeKid });
}

function verifyWithAnyKey(token) {
  const { keys } = loadJwtKeyConfig();
  for (const secret of Object.values(keys)) {
    try { return jwt.verify(token, secret); } catch {}
  }
  throw new Error("invalid token");
}

function poserCookie(token) {
  const secure = process.env.NODE_ENV === "production";
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: DUREE_SESSION, secure });
}

export function creerSession(user, opts = {}) {
  const now = Math.floor(Date.now() / 1000);
  const mfaEnabled = !!user.mfa_active;
  const mfaLevel = opts.mfaLevel || (mfaEnabled ? "full" : "none");
  const token = signWithActiveKey(
    { uid: user.id, etudeId: user.etude_id, role: user.role, nom: user.nom_affiche,
      etudeNom: user.etude_nom || null, fonction: user.fonction || null,
        niveauAcces: user.niveau_acces || (user.role === 'admin_etude' ? 'administrateur' : 'standard'),
        doitChangerMdp: !!user.doit_changer_mdp,
        mfaEnabled,
        mfaLevel,
        mfaVerifiedAt: opts.mfaVerifiedAt || now,
        sessionDebut: now },
    DUREE_SESSION
  );
  poserCookie(token);
}

/**
 * Fenêtre glissante : si plus de la moitié de DUREE_SESSION s'est écoulée
 * depuis la dernière émission, re-signe un cookie frais (même contenu, exp
 * repoussée) pour éviter une déconnexion en pleine saisie — SAUF au-delà de
 * DUREE_MAX_ABSOLUE depuis la connexion initiale (sessionDebut), qui reste
 * une limite dure même en cas d'activité continue.
 */
function rafraichirSiNecessaire(s) {
  const now = Math.floor(Date.now() / 1000);
  const debut = Number(s.sessionDebut || s.iat || now);
  if (now - debut >= DUREE_MAX_ABSOLUE) return;
  const restant = Number(s.exp || now) - now;
  if (restant > DUREE_SESSION / 2) return;
  const { iat, exp, ...payload } = s;
  const token = signWithActiveKey(payload, DUREE_SESSION);
  poserCookie(token);
}

export function fermerSession() {
  cookies().delete(COOKIE);
}

/** Retourne la session courante ou null. À appeler dans chaque route API. */
export function session() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try { return verifyWithAnyKey(token); }
  catch { return null; }
}

export function creerMfaChallenge(user) {
  return signWithActiveKey(
    { type: "mfa_challenge", uid: user.id, etudeId: user.etude_id, nom: user.nom_affiche },
    60 * 5
  );
}

export function verifierMfaChallenge(token) {
  const payload = verifyWithAnyKey(token);
  if (payload?.type !== "mfa_challenge") throw new Error("Challenge MFA invalide.");
  return payload;
}

export async function exigerSession(permettreMdpProvisoire = false) {
  const s = session();
  if (!s) { const e = new Error("Non authentifié"); e.status = 401; throw e; }
  // C7 + C14 — révocation immédiate et rafraîchissement niveau_acces / fonction.
  const etat = await etatCompte(s.uid);
  if (!etat) { const e = new Error("Votre accès a été suspendu. Contactez le Notaire de l'étude."); e.status = 403; throw e; }
  s.niveauAcces = etat.niveauAcces;
  s.fonction = etat.fonction;
  // C1 — blocage tant que le mot de passe provisoire n'est pas changé.
  if (s.doitChangerMdp && !permettreMdpProvisoire) {
    const e = new Error("Vous devez d'abord changer votre mot de passe (première connexion).");
    e.status = 403; throw e;
  }
  try { rafraichirSiNecessaire(s); } catch { /* le rafraîchissement est un confort, pas une condition d'accès */ }
  return s;
}

export async function exigerStepUp(windowMinutes = DEFAULT_STEPUP_WINDOW_MINUTES) {
  const s = await exigerSession();
  if (!s.mfaEnabled) return s;
  const verifiedAt = Number(s.mfaVerifiedAt || 0);
  const age = Math.floor(Date.now() / 1000) - verifiedAt;
  if (s.mfaLevel !== "stepup" || age > windowMinutes * 60) {
    const e = new Error("Validation MFA requise pour cette action sensible.");
    e.status = 403;
    throw e;
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

/** exigerAdmin() : Administrateur SEUL (comptes, paramètres, suppression, démo). */
export async function exigerAdmin() {
  const s = await exigerSession();
  const n = s.niveauAcces || (s.role === "admin_etude" ? "administrateur" : "standard");
  if (s.role !== "super_admin" && n !== "administrateur") {
    const e = new Error("Réservé à l'Administrateur de l'étude"); e.status = 403; throw e;
  }
  return s;
}

/** Administration plateforme SaaS (éditeur) uniquement. */
export async function exigerSuperAdmin() {
  const s = await exigerSession();
  if (s.role !== "super_admin") {
    const e = new Error("Réservé au Super Administrateur.");
    e.status = 403;
    throw e;
  }
  return s;
}

/**
 * I9 — SUPPRIMÉ. estAdmin() se fondait sur `role` et a causé la faille C9
 * (le Notaire salarié, de role 'admin_etude', obtenait les droits d'Administrateur).
 * L'autorisation passe désormais EXCLUSIVEMENT par src/lib/acces.js, qui lit `niveau_acces`.
 * N'introduisez pas de nouveau contrôle fondé sur `role`.
 */
