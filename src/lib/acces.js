/**
 * Matrice centralisee des droits NOTARIA (socle v3.5).
 * Toute autorisation doit passer par ce module.
 */
export const NIVEAUX = ["administrateur", "notaire_salarie", "comptable", "standard", "renseignement"];

export const FONCTIONS = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
  "Formaliste", "Comptable", "Archiviste", "Secrétariat", "Accueil",
];

/** P0.3 — Tolérant aux libellés Notaire / Clerc (pas de liste figée). */
export const estRedacteur = (fonction) => /^(notaire|clerc)/i.test((fonction || "").trim());

export const FONCTIONS_REDACTRICES = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
];

const niveau = (s) => s?.niveauAcces || (s?.role === "admin_etude" ? "administrateur" : "standard");

export const estAdministrateur = (s) => niveau(s) === "administrateur";
export const estNotaire = (s) => ["administrateur", "notaire_salarie"].includes(niveau(s));
export const estComptable = (s) => niveau(s) === "comptable";
export const estFormaliste = (s) => s?.fonction === "Formaliste";
export const estAccueil = (s) => s?.fonction === "Accueil";
/** Niveau « Renseignement » : registre appels/courriers uniquement. */
export const estRenseignement = (s) => niveau(s) === "renseignement";

export const voitMontants = (s) => estNotaire(s) || estComptable(s);
/** C4 — Accueil, Archiviste et niveau Renseignement n'ouvrent pas les actes. */
export const voitRegistreActes = (s) => !estAccueil(s) && !estRenseignement(s)
  && s?.fonction !== "Archiviste";

/** P2.5 — Le Comptable accède aussi au registre des appels. */
export const voitRegistreAppels = (s) => true;

export const voitTableauActes = (s) => estNotaire(s);
export const voitTableauAppels = (s) => true;
export const voitFinancier = (s) => estNotaire(s) || estComptable(s);

/** Comptable = droits rédacteur + ventilation. */
export const saisitPrevision = (s) => estNotaire(s) || estComptable(s) || estRedacteur(s?.fonction);
export const saisitDepenses = (s) => estNotaire(s) || estComptable(s);
export const modifieFormalites = (s) => estNotaire(s) || estComptable(s) || estFormaliste(s);

export const gereComptes = (s) => estAdministrateur(s);
export const gereParametres = (s) => estAdministrateur(s);
export const supprimeCompte = (s) => estAdministrateur(s);
export const modifieTva = (s) => estNotaire(s) || estComptable(s);

const CHAMPS_VENTILATION = [
  "emoluments", "exonere_tva", "droits_etat", "debours",
  "autres_depenses", "autres_depenses_motif",
];

const CHAMPS_PREVISION = ["valeur_acte", "honoraires_totaux", "montant_regle", "statut_paiement"];

export function filtrerActe(ligne, s) {
  if (!ligne) return ligne;
  const copie = { ...ligne };
  if (!voitMontants(s)) for (const c of CHAMPS_VENTILATION) delete copie[c];
  if (!saisitPrevision(s)) for (const c of CHAMPS_PREVISION) delete copie[c];
  if (!voitMontants(s) && !estFormaliste(s)) delete copie.depenses_formalites;
  return copie;
}

/** C20 — plafond du montant réglé (total client prioritaire, ventilation en secours). */
export function plafondReglement(d) {
  const n = (v) => Number(v || 0);
  const totalFrais = n(d.honoraires_totaux);
  const ventile = n(d.emoluments) + n(d.droits_etat) + n(d.debours) + n(d.autres_depenses);
  return totalFrais > 0 ? totalFrais : ventile;
}

export function estVentile(d) {
  const n = (v) => Number(v || 0);
  return n(d.emoluments) + n(d.droits_etat) + n(d.debours) + n(d.autres_depenses) > 0;
}
