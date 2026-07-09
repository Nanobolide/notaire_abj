/**
 * Matrice centralisee des droits NOTARIA (V3).
 * Toute autorisation doit passer par ce module.
 */
export const NIVEAUX = ["administrateur", "notaire_salarie", "comptable", "standard"];

export const FONCTIONS = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
  "Formaliste", "Comptable", "Archiviste", "Secrétariat", "Accueil",
];

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
export const saisitDepenses = (s) => estNotaire(s) || estComptable(s) || estFormaliste(s);
export const gereComptes = (s) => estAdministrateur(s);
export const gereParametres = (s) => estAdministrateur(s);
export const supprimeCompte = (s) => estAdministrateur(s);
export const modifieTva = (s) => estNotaire(s) || estComptable(s);

const CHAMPS_FINANCIERS = [
  "valeur_acte", "honoraires_totaux", "montant_regle", "statut_paiement",
  "emoluments", "exonere_tva", "droits_etat", "debours", "debours_rembourses",
  "prestations_annexes",
];

export function filtrerActe(ligne, s) {
  if (!ligne || voitMontants(s)) return ligne;
  const copie = { ...ligne };
  for (const c of CHAMPS_FINANCIERS) delete copie[c];
  if (!estFormaliste(s)) delete copie.depenses_formalites;
  return copie;
}
