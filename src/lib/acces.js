/**
 * Matrice des niveaux d'accès NOTARIA (v2.3).
 * Un seul endroit décide de qui voit quoi. Toujours appliquée CÔTÉ SERVEUR.
 */
export const NIVEAUX = ["administrateur", "notaire_salarie", "comptable", "standard"];

export const FONCTIONS = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
  "Formaliste", "Comptable", "Archiviste", "Secrétariat", "Accueil",
];

/** Fonctions autorisées à être responsables d'un ACTE (ceux qui rédigent). */
export const FONCTIONS_REDACTRICES = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
];

const niv = (s) => s?.niveauAcces || (s?.role === "admin_etude" ? "administrateur" : "standard");

export const estAdministrateur = (s) => niv(s) === "administrateur";
export const estNotaire = (s) => ["administrateur", "notaire_salarie"].includes(niv(s));
export const estComptable = (s) => niv(s) === "comptable";
export const estFormaliste = (s) => s?.fonction === "Formaliste";
export const estAccueil = (s) => s?.fonction === "Accueil";

/** Qui peut voir les MONTANTS (registres + tableau de bord financier). */
export const voitMontants = (s) => estNotaire(s) || estComptable(s);

/** Qui peut ouvrir le registre des actes. */
export const voitRegistreActes = (s) => !estAccueil(s);

/** Qui peut ouvrir le registre des appels. */
export const voitRegistreAppels = (s) => !estComptable(s);

/** Qui voit le bloc « Actes » du tableau de bord. */
export const voitTableauActes = (s) => estNotaire(s);

/** Qui voit le bloc « Appels » du tableau de bord : tout le monde sauf le Comptable. */
export const voitTableauAppels = (s) => !estComptable(s);

/** Qui voit le bloc financier. */
export const voitFinancier = (s) => estNotaire(s) || estComptable(s);

/** Qui peut saisir des dépenses de formalités. */
export const saisitDepenses = (s) => estNotaire(s) || estComptable(s) || estFormaliste(s);

/** Qui peut gérer les comptes / paramètres / supprimer un compte. */
export const gereComptes = (s) => estAdministrateur(s);
export const gereParametres = (s) => estAdministrateur(s);
export const supprimeCompte = (s) => estAdministrateur(s);

/** Qui peut modifier le taux de TVA (Notaire, Notaire salarié, Comptable). */
export const modifieTva = (s) => estNotaire(s) || estComptable(s);

/** Champs financiers retirés des actes pour ceux qui n'y ont pas droit. */
const CHAMPS_FINANCIERS = [
  "valeur_acte", "honoraires_totaux", "montant_regle", "statut_paiement",
  "emoluments", "exonere_tva", "droits_etat", "debours", "debours_rembourses",
  "prestations_annexes",
];

/** Retire les montants d'une ligne d'acte selon le niveau d'accès. */
export function filtrerActe(ligne, s) {
  if (!ligne) return ligne;
  if (voitMontants(s)) return ligne;
  const copie = { ...ligne };
  for (const c of CHAMPS_FINANCIERS) delete copie[c];
  // Le formaliste garde ses propres dépenses ; les autres ne les voient pas.
  if (!estFormaliste(s)) delete copie.depenses_formalites;
  return copie;
}
