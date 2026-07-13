/**
 * Matrice des niveaux d'accès NOTARIA (v2.3).
 * Un seul endroit décide de qui voit quoi. Toujours appliquée CÔTÉ SERVEUR.
 */
export const NIVEAUX = ["administrateur", "notaire_salarie", "comptable", "standard", "renseignement"];

export const FONCTIONS = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
  "Formaliste", "Comptable", "Archiviste", "Secrétariat", "Accueil",
];

/**
 * P0.3 — Une fonction rédige-t-elle des actes ?
 * Tolérant aux libellés : « Notaire principal », « Notaire salarié », « Notaire en second »,
 * « Clerc principal », « Clerc de 1ère catégorie », « Clerc 1 »… Aucune liste codée en dur.
 */
export const estRedacteur = (fonction) => /^(notaire|clerc)/i.test((fonction || "").trim());

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
/** Niveau « Renseignement » : uniquement le registre des appels/courriers, en saisie. Rien d'autre. */
export const estRenseignement = (s) => niv(s) === "renseignement";

/** Qui peut voir les MONTANTS (registres + tableau de bord financier). */
export const voitMontants = (s) => estNotaire(s) || estComptable(s);

/** Qui peut ouvrir le registre des actes. */
export const voitRegistreActes = (s) => !estAccueil(s) && !estRenseignement(s);

/**
 * P2.5 — Qui peut ouvrir le registre des appels.
 * Le Comptable a les mêmes accès qu'un collaborateur standard, PLUS le module Comptabilité.
 * Il n'a pas les vues réservées au Notaire (comptes, paramètres, tableau de bord Actes).
 */
export const voitRegistreAppels = (s) => true;

/** Qui voit le bloc « Actes » du tableau de bord. */
export const voitTableauActes = (s) => estNotaire(s);

/** Qui voit le bloc « Appels » du tableau de bord : tout le monde. */
export const voitTableauAppels = (s) => true;

/** Qui voit le bloc financier. */
export const voitFinancier = (s) => estNotaire(s) || estComptable(s);

/**
 * Proposition n°3 — Le CLERC saisit la PRÉVISION : les frais annoncés au client et ce qu'il a versé.
 * Il ne voit ni ne touche à la ventilation (émoluments / droits d'État / débours) : c'est le
 * Comptable qui l'établit une fois les montants définitifs connus.
 */
export const saisitPrevision = (s) => estNotaire(s) || estComptable(s) || estRedacteur(s?.fonction);

/**
 * C17 — Qui peut saisir des MONTANTS de dépenses.
 * Proposition n°1 validée : « Le Formaliste ne saisit PLUS de montants ».
 * La comptabilité est le point de saisie unique des dépenses.
 */
export const saisitDepenses = (s) => estNotaire(s) || estComptable(s);

/** Qui peut faire avancer l'état des formalités (statut seul, aucun montant). */
export const modifieFormalites = (s) => estNotaire(s) || estComptable(s) || estFormaliste(s);

/** Qui peut gérer les comptes / paramètres / supprimer un compte. */
export const gereComptes = (s) => estAdministrateur(s);
export const gereParametres = (s) => estAdministrateur(s);
export const supprimeCompte = (s) => estAdministrateur(s);

/** Qui peut modifier le taux de TVA (Notaire, Notaire salarié, Comptable). */
export const modifieTva = (s) => estNotaire(s) || estComptable(s);

/** Champs financiers retirés des actes pour ceux qui n'y ont pas droit. */
/** La VENTILATION : réservée au Notaire et au Comptable. */
const CHAMPS_VENTILATION = [
  "emoluments", "exonere_tva", "droits_etat", "debours",
  "prestations_annexes", "autres_depenses", "autres_depenses_motif",
];

/** La PRÉVISION : le Clerc rédacteur la saisit et la voit ; les autres (Accueil, Archiviste) non. */
const CHAMPS_PREVISION = ["valeur_acte", "honoraires_totaux", "montant_regle", "statut_paiement"];

/**
 * P2.5 (décision finale) — Le Comptable voit les mêmes informations qu'un collaborateur
 * standard : numéro de dossier, numéro de minute, nom du client, total des frais, versé,
 * reste à payer. Aucun champ ne lui est masqué : la distinction créait plus de gêne que de
 * protection, et il a besoin du dossier pour ventiler.
 */

/** Filtre une ligne d'acte selon le niveau d'accès (montants ET contenu). */
export function filtrerActe(ligne, s) {
  if (!ligne) return ligne;
  const copie = { ...ligne };
  // 1) La ventilation : Notaire et Comptable seulement.
  if (!voitMontants(s)) for (const c of CHAMPS_VENTILATION) delete copie[c];
  // 2) La prévision (total des frais, versé, reste) : rédacteurs, Notaire et Comptable.
  if (!saisitPrevision(s)) for (const c of CHAMPS_PREVISION) delete copie[c];
  // 3) Les dépenses de formalités : Notaire, Comptable, Formaliste.
  if (!voitMontants(s) && !estFormaliste(s)) delete copie.depenses_formalites;
  return copie;
}

/**
 * C20 — Plafond du montant réglé.
 * Le versé se compare au TOTAL RÉELLEMENT FACTURÉ (ventilation du comptable) dès que celle-ci
 * existe ; à défaut, aux frais annoncés par le clerc (prévision). Sans ce correctif, le Comptable
 * qui ventile un dossier dont le clerc n'a pas saisi de prévision voyait sa saisie rejetée.
 * Total facturé = émoluments + droits d'État + débours + prestations annexes + autres dépenses.
 */
export function plafondReglement(d) {
  const n = (v) => Number(v || 0);
  const totalFrais = n(d.honoraires_totaux);            // ce que paie le client (saisi par le clerc)
  const ventile = n(d.emoluments) + n(d.droits_etat) + n(d.debours) + n(d.autres_depenses);
  // Le plafond est le total des frais. Si aucun total n'est saisi mais qu'une ventilation existe,
  // c'est elle qui fait référence (le comptable a pu compléter avant le clerc).
  return totalFrais > 0 ? totalFrais : ventile;
}

/** Un dossier est-il ventilé ? (au moins un poste comptable saisi) */
export function estVentile(d) {
  const n = (v) => Number(v || 0);
  return n(d.emoluments) + n(d.droits_etat) + n(d.debours) + n(d.autres_depenses) > 0;
}
