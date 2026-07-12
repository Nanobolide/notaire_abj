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
export function seuilsActe(acte, p = null) {
  if (acte.nature_acte === "Succession")
    return p ? { s1: p.succession_s1, s2: p.succession_s2, s3: p.succession_s3 } : { s1: 180, s2: 270, s3: 365 };
  if (acte.complexite === "Simple")
    return p ? { s1: p.acte_simple_s1, s2: p.acte_simple_s2, s3: p.acte_simple_s3 } : { s1: 20, s2: 40, s3: 60 };
  return p ? { s1: p.acte_complexe_s1, s2: p.acte_complexe_s2, s3: p.acte_complexe_s3 } : { s1: 30, s2: 60, s3: 90 };
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
export function couleurAppel(appel, p = null) {
  const C = coul(p);
  if (appel.statut_traitement === "Résolu") return { fond: C.ok, nom: "vert_pale" };
  const j = joursEcoules(appel.date_entree, appel.resolu_le);
  const s1 = p ? p.appel_s1 : SEUILS_APPEL.s1;
  const s2 = p ? p.appel_s2 : SEUILS_APPEL.s2;
  const s3 = p ? p.appel_s3 : SEUILS_APPEL.s3;
  if (j > s3) return { fond: C.n3, nom: "rouge" };
  if (j > s2) return { fond: C.n2, nom: "orange" };
  if (j > s1) return { fond: C.n1, nom: "jaune" };
  return { fond: "#FFFFFF", nom: "blanc" };
}

/** Couleurs effectives : celles de l'étude si définies, sinon les valeurs par défaut. */
function coul(p) {
  return {
    n1: p?.couleur_n1 || "#FFF4C2", n2: p?.couleur_n2 || "#FFD9A0",
    n3: p?.couleur_n3 || "#FF9E9E", ok: p?.couleur_ok || "#E9F7EC",
  };
}

/**
 * Coloration Suivi des Actes — priorité décroissante :
 * Vert (Terminé) > Violet (Annulé) > Rouge (>30j) > Orange (>14j) > Jaune (>7j) > Blanc.
 */
export function couleurActe(acte, p = null) {
  const C = coul(p);
  if (acte.progression === "Terminé") return { fond: C.ok, nom: "vert_pale" };
  if (acte.progression === "Annulé")  return { fond: "#F0EAF8", nom: "violet" };
  const j = joursEcoules(acte.date_ouverture, acte.termine_le);
  const { s1, s2, s3 } = seuilsActe(acte, p);
  if (j > s3) return { fond: C.n3, nom: "rouge" };
  if (j > s2) return { fond: C.n2, nom: "orange" };
  if (j > s1) return { fond: C.n1, nom: "jaune" };
  return { fond: "#FFFFFF", nom: "blanc" };
}

/**
 * Échéance par défaut d'un acte quand aucune n'est saisie : Succession 180 j,
 * Simple 20 j, sinon (Complexe ou non renseigné) 30 j. Retourne une date
 * "YYYY-MM-DD" à partir de la date d'ouverture (ou aujourd'hui si absente).
 */
export function echeanceParDefaut(natureActe, complexite, dateOuverture) {
  const base = dateOuverture ? new Date(dateOuverture) : new Date();
  const jours = natureActe === "Succession" ? 180 : complexite === "Simple" ? 20 : 30;
  base.setDate(base.getDate() + jours);
  return base.toISOString().slice(0, 10);
}

/** Respect de l'échéance : OK / ⚠ Dépassée (sauf Terminé/Annulé). */
export function respectEcheance(acte) {
  if (acte.progression === "Terminé" || acte.progression === "Annulé") return "—";
  return new Date() > new Date(acte.date_echeance) ? "⚠ Dépassée" : "OK";
}

export function totalFacture(acte) {
  const n = (v) => Number(v || 0);
  const totalFrais = n(acte.honoraires_totaux);
  const ventile = n(acte.emoluments) + n(acte.droits_etat) + n(acte.debours) + n(acte.autres_depenses);
  return totalFrais > 0 ? totalFrais : ventile;
}

export function resteAPayer(acte) {
  return Math.max(0, totalFacture(acte) - Number(acte.montant_regle || 0));
}

export function formatFcfa(n) {
  return new Intl.NumberFormat("fr-FR").format(Number(n || 0)) + " FCFA";
}
