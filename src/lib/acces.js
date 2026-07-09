/**
 * Matrice centralisee des droits NOTARIA (V3 + socle v3.0).
 * Toute autorisation doit passer par ce module.
 */
export const NIVEAUX = ["administrateur", "notaire_salarie", "comptable", "standard"];

export const FONCTIONS = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
  "Formaliste", "Comptable", "Archiviste", "Secrétariat", "Accueil",
];

export const FONCTIONS_REDACTRICES = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
];

export const estRedacteur = (fonction) => FONCTIONS_REDACTRICES.includes(fonction);

const niveau = (s) => s?.niveauAcces || (s?.role === "admin_etude" ? "administrateur" : "standard");

export const estAdministrateur = (s) => niveau(s) === "administrateur";
export const estNotaire = (s) => ["administrateur", "notaire_salarie"].includes(niveau(s));
export const estComptable = (s) => niveau(s) === "comptable";
export const estFormaliste = (s) => s?.fonction === "Formaliste";
export const estAccueil = (s) => s?.fonction === "Accueil";

export const voitMontants = (s) => estNotaire(s) || estComptable(s);
export const voitRegistreActes = (s) => !estAccueil(s);
export const voitRegistreAppels = (s) => !estComptable(s);
export const voitTableauActes = (s) => estNotaire(s);
export const voitTableauAppels = (s) => !estComptable(s);
export const voitFinancier = (s) => estNotaire(s) || estComptable(s);

/** Prévision : frais annoncés et versé — Clerc rédacteur inclus. */
export const saisitPrevision = (s) => estNotaire(s) || estComptable(s) || estRedacteur(s?.fonction);

/** C17 — montants de dépenses : Notaire et Comptable seulement. */
export const saisitDepenses = (s) => estNotaire(s) || estComptable(s);

/** Statut des formalités : Formaliste, Notaire, Comptable. */
export const modifieFormalites = (s) => estNotaire(s) || estComptable(s) || estFormaliste(s);

export const gereComptes = (s) => estAdministrateur(s);
export const gereParametres = (s) => estAdministrateur(s);
export const supprimeCompte = (s) => estAdministrateur(s);
export const modifieTva = (s) => estNotaire(s) || estComptable(s);

const CHAMPS_VENTILATION = [
  "emoluments", "exonere_tva", "droits_etat", "debours", "debours_rembourses",
  "prestations_annexes", "autres_depenses", "autres_depenses_motif",
];

const CHAMPS_PREVISION = ["valeur_acte", "honoraires_totaux", "montant_regle", "statut_paiement"];
const CHAMPS_CONFIDENTIELS = ["observations", "difficultes"];

export function filtrerActe(ligne, s) {
  if (!ligne) return ligne;
  const copie = { ...ligne };
  if (!voitMontants(s)) for (const c of CHAMPS_VENTILATION) delete copie[c];
  if (!saisitPrevision(s)) for (const c of CHAMPS_PREVISION) delete copie[c];
  if (!voitMontants(s) && !estFormaliste(s)) delete copie.depenses_formalites;
  if (estComptable(s)) for (const c of CHAMPS_CONFIDENTIELS) delete copie[c];
  return copie;
}

/** C20 — plafond du montant réglé (ventilation prioritaire sur prévision). */
export function plafondReglement(d) {
  const n = (v) => Number(v || 0);
  const ventile = n(d.emoluments) + n(d.droits_etat) + n(d.debours) +
                  n(d.prestations_annexes) + n(d.autres_depenses);
  return ventile > 0 ? ventile : n(d.honoraires_totaux);
}
