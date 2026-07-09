/**
 * P5.1 — Tri par colonne des registres.
 * Détecte automatiquement le type : nombre, date, ou texte (accents ignorés).
 */
export function comparer(a, b, champ) {
  const va = a?.[champ], vb = b?.[champ];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;      // les vides toujours en bas
  if (vb == null) return -1;
  const na = Number(va), nb = Number(vb);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && va !== "" && vb !== "") return na - nb;
  const da = Date.parse(va), db = Date.parse(vb);
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  return String(va).localeCompare(String(vb), "fr", { sensitivity: "base", numeric: true });
}

export function trier(lignes, champ, sens) {
  if (!champ) return lignes;
  const copie = [...lignes];
  copie.sort((a, b) => (sens === "desc" ? -1 : 1) * comparer(a, b, champ));
  return copie;
}

/** Indicateur visuel ▲▼ à placer dans l'en-tête. */
export const fleche = (champ, actif, sens) =>
  actif === champ ? (sens === "desc" ? " ▼" : " ▲") : "";
