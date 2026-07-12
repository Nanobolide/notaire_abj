/** Référentiels par défaut v3.5 — appliqués à toute nouvelle étude provisionnée. */

export const PROGRESSION_V35 = [
  "Recensement des informations", "Paiement", "Formalité antérieure",
  "Rédaction", "Signature", "Préparation des formalités",
  "Dépôt des formalités", "Retrait de la minute", "Réception de l'état foncier",
  "Réception du CMPF", "Transmission client", "Terminé", "Annulé",
];

export const NATURE_ACTE_V35 = [
  "Société", "Bail", "Vente", "Achat", "Donation", "Succession",
  "Ouverture de Crédit", "Mainlevée d'Hypothèque", "Procuration", "Contrat de Mariage",
  "Légalisation", "Adoption", "Reconnaissance d'Enfant Naturel", "Dation en Paiement", "Autres",
];

const paires = [
  ["type_flux", "Appel Téléphonique"], ["type_flux", "Courrier Physique"], ["type_flux", "Courrier Électronique"],
  ["type_flux", "Visite Client"],
  ["destinataire", "Le Notaire"], ["destinataire", "Clerc 1"], ["destinataire", "Clerc 2"],
  ["destinataire", "Clerc 3"], ["destinataire", "Comptabilité"], ["destinataire", "Formaliste"], ["destinataire", "Accueil"],
  ["motif", "Nouvelle demande"], ["motif", "Suivi dossier existant"], ["motif", "Réclamation"],
  ["motif", "RDV"], ["motif", "Renseignement général"], ["motif", "Relance paiement"], ["motif", "Géo-localisation"],
  ["statut_traitement", "Non commencé"], ["statut_traitement", "En cours"],
  ["statut_traitement", "En attente du Clerc"], ["statut_traitement", "Résolu"],
  ...NATURE_ACTE_V35.map((v) => ["nature_acte", v]),
  ["responsable", "Le Notaire"], ["responsable", "Clerc 1"], ["responsable", "Clerc 2"], ["responsable", "Clerc 3"],
  ...PROGRESSION_V35.map((v) => ["progression", v]),
  ["statut_paiement", "Réglé"], ["statut_paiement", "Partiel"], ["statut_paiement", "En attente"],
  ["conservation_fonciere", "ABENGOUROU"], ["conservation_fonciere", "ABOBO"], ["conservation_fonciere", "ADZOPE"],
  ["conservation_fonciere", "AGBOVILLE"], ["conservation_fonciere", "BINGERVILLE"], ["conservation_fonciere", "BONDOUKOU"],
  ["conservation_fonciere", "BOUAFLE"], ["conservation_fonciere", "BOUAKE"], ["conservation_fonciere", "COCODY"],
  ["conservation_fonciere", "DABOU"], ["conservation_fonciere", "DALOA"], ["conservation_fonciere", "DIMBOKRO"],
  ["conservation_fonciere", "DIVO"], ["conservation_fonciere", "GAGNOA"], ["conservation_fonciere", "GRAND-BASSAM"],
  ["conservation_fonciere", "GUIGLO"], ["conservation_fonciere", "KORHOGO"], ["conservation_fonciere", "MAN"],
  ["conservation_fonciere", "MARCORY"], ["conservation_fonciere", "ODIENNE"], ["conservation_fonciere", "PLATEAU"],
  ["conservation_fonciere", "RIVIERA"], ["conservation_fonciere", "SAN PEDRO"], ["conservation_fonciere", "SEGUELA"],
  ["conservation_fonciere", "SONGON"], ["conservation_fonciere", "TREICHVILLE"], ["conservation_fonciere", "YAMOUSSOUKRO"],
  ["conservation_fonciere", "YOPOUGON 1"], ["conservation_fonciere", "YOPOUGON 2"],
];

/** Numérote l'ordre à l'intérieur de chaque type_liste. */
export const REFERENTIELS_DEFAUT = (() => {
  const compteurs = {};
  return paires.map(([type_liste, valeur]) => {
    compteurs[type_liste] = (compteurs[type_liste] || 0) + 1;
    return { type_liste, valeur, ordre: compteurs[type_liste] };
  });
})();
