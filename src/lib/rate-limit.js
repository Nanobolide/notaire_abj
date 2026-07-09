/** Limiteur de débit en mémoire — suffisant pour une instance unique (pas de Redis). */
const compteurs = new Map();

/** Retourne true si l'appel est autorisé, false si la limite est atteinte. */
export function autoriser(cle, { max = 3, fenetreMs = 10 * 60 * 1000 } = {}) {
  const maintenant = Date.now();
  const entree = compteurs.get(cle);
  if (!entree || maintenant - entree.debut > fenetreMs) {
    compteurs.set(cle, { debut: maintenant, total: 1 });
    return true;
  }
  if (entree.total >= max) return false;
  entree.total++;
  return true;
}
