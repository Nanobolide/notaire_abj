/**
 * Tests unitaires — règles métier financières et de visibilité.
 * Pur (aucun accès DB), via node:test. Exécution : npm run test:regles
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Les modules testés sont en ESM (export …) ; require() direct échouerait sous
// Node CJS. On passe par import() dynamique (asynchrone), supporté par node:test.
async function libs() {
  const acces = await import("../src/lib/acces.js");
  const regles = await import("../src/lib/regles.js");
  return { acces, regles };
}

test("plafondReglement — total facturé prioritaire sur la ventilation", async () => {
  const { acces } = await libs();
  assert.equal(acces.plafondReglement({ honoraires_totaux: 850000, emoluments: 100000 }), 850000);
});

test("plafondReglement — repli sur la somme ventilée si pas de total facturé", async () => {
  const { acces } = await libs();
  assert.equal(
    acces.plafondReglement({ honoraires_totaux: 0, emoluments: 100000, droits_etat: 50000, debours: 25000, autres_depenses: 10000 }),
    185000
  );
});

test("plafondReglement — zéro si rien n'est renseigné", async () => {
  const { acces } = await libs();
  assert.equal(acces.plafondReglement({}), 0);
});

test("estVentile — faux quand tous les champs de ventilation sont vides/absents", async () => {
  const { acces } = await libs();
  assert.equal(acces.estVentile({}), false);
  assert.equal(acces.estVentile({ emoluments: 0, droits_etat: 0 }), false);
});

test("estVentile — vrai dès qu'un champ de ventilation est positif", async () => {
  const { acces } = await libs();
  assert.equal(acces.estVentile({ debours: 5000 }), true);
});

test("filtrerActe — Accueil (standard) : ni montants ni prévision ni dépenses formalités", async () => {
  const { acces } = await libs();
  const ligne = {
    id: "x", emoluments: 100, exonere_tva: false, droits_etat: 200, debours: 300,
    autres_depenses: 0, autres_depenses_motif: null,
    valeur_acte: 1000, honoraires_totaux: 500, montant_regle: 100, statut_paiement: "Partiel",
    depenses_formalites: 42,
  };
  const filtre = acces.filtrerActe(ligne, { niveauAcces: "standard", fonction: "Accueil" });
  for (const c of ["emoluments", "exonere_tva", "droits_etat", "debours", "autres_depenses", "autres_depenses_motif"])
    assert.equal(c in filtre, false, `${c} ne devrait pas être visible`);
  for (const c of ["valeur_acte", "honoraires_totaux", "montant_regle", "statut_paiement"])
    assert.equal(c in filtre, false, `${c} ne devrait pas être visible`);
  assert.equal("depenses_formalites" in filtre, false);
  assert.equal(filtre.id, "x", "les champs hors périmètre restent intacts");
});

test("filtrerActe — Notaire (administrateur) voit tout", async () => {
  const { acces } = await libs();
  const ligne = { emoluments: 100, valeur_acte: 1000, depenses_formalites: 42 };
  const filtre = acces.filtrerActe(ligne, { niveauAcces: "administrateur" });
  assert.equal(filtre.emoluments, 100);
  assert.equal(filtre.valeur_acte, 1000);
  assert.equal(filtre.depenses_formalites, 42);
});

test("filtrerActe — Formaliste voit depenses_formalites mais pas les montants", async () => {
  const { acces } = await libs();
  const ligne = { emoluments: 100, depenses_formalites: 42 };
  const filtre = acces.filtrerActe(ligne, { niveauAcces: "standard", fonction: "Formaliste" });
  assert.equal("emoluments" in filtre, false);
  assert.equal(filtre.depenses_formalites, 42);
});

test("echeanceParDefaut — Succession : 180 jours après l'ouverture", async () => {
  const { regles } = await libs();
  assert.equal(regles.echeanceParDefaut("Succession", "Complexe", "2026-01-01"), "2026-06-29");
});

test("echeanceParDefaut — Simple : 20 jours après l'ouverture", async () => {
  const { regles } = await libs();
  assert.equal(regles.echeanceParDefaut("Vente", "Simple", "2026-01-01"), "2026-01-21");
});

test("echeanceParDefaut — sans nature/complexité reconnue : 30 jours par défaut", async () => {
  const { regles } = await libs();
  assert.equal(regles.echeanceParDefaut("Vente", "Complexe", "2026-01-01"), "2026-01-31");
  assert.equal(regles.echeanceParDefaut(null, null, "2026-01-01"), "2026-01-31");
});

test("joursEcoules — se fige à la date de fin fournie (résolution/clôture)", async () => {
  const { regles } = await libs();
  assert.equal(regles.joursEcoules("2026-01-01", "2026-01-15"), 14);
});

test("seuilsActe — barèmes par défaut (sans paramétrage d'étude)", async () => {
  const { regles } = await libs();
  assert.deepEqual(regles.seuilsActe({ nature_acte: "Succession" }), { s1: 180, s2: 270, s3: 365 });
  assert.deepEqual(regles.seuilsActe({ complexite: "Simple" }), { s1: 20, s2: 40, s3: 60 });
  assert.deepEqual(regles.seuilsActe({ complexite: "Complexe" }), { s1: 30, s2: 60, s3: 90 });
});

test("respectEcheance — Dépassée si la date est passée et l'acte n'est pas clos", async () => {
  const { regles } = await libs();
  assert.equal(regles.respectEcheance({ progression: "Rédaction", date_echeance: "2020-01-01" }), "⚠ Dépassée");
});

test("respectEcheance — jamais 'Dépassée' pour un acte Terminé ou Annulé", async () => {
  const { regles } = await libs();
  assert.equal(regles.respectEcheance({ progression: "Terminé", date_echeance: "2020-01-01" }), "—");
  assert.equal(regles.respectEcheance({ progression: "Annulé", date_echeance: "2020-01-01" }), "—");
});

test("totalFacture / resteAPayer — cohérence avec plafondReglement", async () => {
  const { regles } = await libs();
  const acte = { honoraires_totaux: 850000, montant_regle: 500000 };
  assert.equal(regles.totalFacture(acte), 850000);
  assert.equal(regles.resteAPayer(acte), 350000);
});

test("resteAPayer — jamais négatif même en cas de trop-perçu", async () => {
  const { regles } = await libs();
  assert.equal(regles.resteAPayer({ honoraires_totaux: 100, montant_regle: 999 }), 0);
});
