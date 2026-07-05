/**
 * Moteur de règles métier — SLA, jours écoulés, colorations.
 * Reprend exactement la logique des registres Excel V7 / V2.
 * Utilisé côté serveur (API) ET côté client (affichage).
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Jours écoulés ; figé à la résolution / clôture (exigence « se fige si Résolu »). */
export function joursEcoules(dateEntree, dateFin) {
  const debut = new Date(dateEntree);
  const fin = dateFin ? new Date(dateFin) : new Date();
  return Math.max(0, Math.floor((fin - debut) / JOUR_MS));
}

/** Barème d'un acte : Succession 180/270/365 j — Simple 20/40/60 j — Complexe 30/60/90 j. */
export function seuilsActe(acte) {
  if (acte.nature_acte === "Succession") return { s1: 180, s2: 270, s3: 365 };
  if (acte.complexite === "Simple") return { s1: 20, s2: 40, s3: 60 };
  return { s1: 30, s2: 60, s3: 90 };
}

/** Barème unifié appels ET courriers : 3 / 5 / 10 jours. */
export const SEUILS_APPEL = { s1: 3, s2: 5, s3: 10 };

/** Niveau d'alerte d'un appel/courrier : "ok" | "suivre" (>3j) | "urgent" (>5j). */
export function niveauAppel(appel) {
  if (appel.statut_traitement === "Résolu") return "resolu";
  const j = joursEcoules(appel.date_entree, appel.resolu_le);
  if (j > SEUILS_APPEL.s2) return "urgent";
  if (j > SEUILS_APPEL.s1) return "suivre";
  return "ok";
}

/**
 * Coloration Journal des Appels — priorité décroissante :
 * Vert (Résolu) > Rouge/Rose (>60j OU alerte SLA OU tentatives ≥3) >
 * Orange foncé (>30j) > Orange clair (>14j) > Jaune (>7j) > Turquoise (>3j) > Blanc.
 */
export function couleurAppel(appel) {
  if (appel.statut_traitement === "Résolu") return { fond: "#E9F7EC", nom: "vert_pale" };
  const j = joursEcoules(appel.date_entree, appel.resolu_le);
  if (j > SEUILS_APPEL.s3) return { fond: "#FF9E9E", nom: "rouge" };
  if (j > SEUILS_APPEL.s2) return { fond: "#FFD9A0", nom: "orange" };
  if (j > SEUILS_APPEL.s1) return { fond: "#FFF4C2", nom: "jaune" };
  return { fond: "#FFFFFF", nom: "blanc" };
}

/**
 * Coloration Suivi des Actes — priorité décroissante :
 * Vert (Terminé) > Violet (Annulé) > Rouge (>30j) > Orange (>14j) > Jaune (>7j) > Blanc.
 */
export function couleurActe(acte) {
  if (acte.progression === "Terminé") return { fond: "#E9F7EC", nom: "vert_pale" };
  if (acte.progression === "Annulé")  return { fond: "#F0EAF8", nom: "violet" };
  const j = joursEcoules(acte.date_ouverture, acte.termine_le);
  const { s1, s2, s3 } = seuilsActe(acte);
  if (j > s3) return { fond: "#FF9E9E", nom: "rouge" };
  if (j > s2) return { fond: "#FFD9A0", nom: "orange" };
  if (j > s1) return { fond: "#FFF4C2", nom: "jaune" };
  return { fond: "#FFFFFF", nom: "blanc" };
}

/** Respect de l'échéance : OK / ⚠ Dépassée (sauf Terminé/Annulé). */
export function respectEcheance(acte) {
  if (acte.progression === "Terminé" || acte.progression === "Annulé") return "—";
  return new Date() > new Date(acte.date_echeance) ? "⚠ Dépassée" : "OK";
}

export function resteAPayer(acte) {
  return Math.max(0, Number(acte.honoraires_totaux || 0) - Number(acte.montant_regle || 0));
}

export function formatFcfa(n) {
  return new Intl.NumberFormat("fr-FR").format(Number(n || 0)) + " FCFA";
}
