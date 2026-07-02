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

/** SLA en heures selon le type de flux : appels 72 h, courriers 5 jours. */
export function slaHeures(typeFlux) {
  return typeFlux === "Appel Téléphonique" ? 72 : 120;
}

/** Alerte SLA (72 h / 5 j) : vraie si non résolu au-delà du délai. */
export function alerteSla(appel) {
  if (appel.statut_traitement === "Résolu") return false;
  const debut = new Date(`${String(appel.date_entree).slice(0, 10)}T${appel.heure || "00:00"}`);
  return (Date.now() - debut.getTime()) / 3600000 > slaHeures(appel.type_flux);
}

/**
 * Coloration Journal des Appels — priorité décroissante :
 * Vert (Résolu) > Rouge/Rose (>60j OU alerte SLA OU tentatives ≥3) >
 * Orange foncé (>30j) > Orange clair (>14j) > Jaune (>7j) > Turquoise (>3j) > Blanc.
 */
export function couleurAppel(appel) {
  if (appel.statut_traitement === "Résolu") return { fond: "#D6F5D6", nom: "vert" };
  const j = joursEcoules(appel.date_entree, appel.resolu_le);
  if (j > 60 || alerteSla(appel) || appel.nb_tentatives >= 3) return { fond: "#FFC7CE", nom: "rouge" };
  if (j > 30) return { fond: "#F4A460", nom: "orange_fonce" };
  if (j > 14) return { fond: "#FFD9B3", nom: "orange_clair" };
  if (j > 7)  return { fond: "#FFF3B0", nom: "jaune" };
  if (j > 3)  return { fond: "#C9F0F0", nom: "turquoise" };
  return { fond: "#FFFFFF", nom: "blanc" };
}

/**
 * Coloration Suivi des Actes — priorité décroissante :
 * Vert (Terminé) > Violet (Annulé) > Rouge (>30j) > Orange (>14j) > Jaune (>7j) > Blanc.
 */
export function couleurActe(acte) {
  if (acte.progression === "Terminé") return { fond: "#D6F5D6", nom: "vert" };
  if (acte.progression === "Annulé")  return { fond: "#E6D6F5", nom: "violet" };
  const j = joursEcoules(acte.date_ouverture, acte.termine_le);
  if (j > 30) return { fond: "#FFC7CE", nom: "rouge" };
  if (j > 14) return { fond: "#FFD9B3", nom: "orange" };
  if (j > 7)  return { fond: "#FFF3B0", nom: "jaune" };
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
