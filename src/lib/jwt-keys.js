/**
 * Résolution des clés JWT — partagée entre src/lib/auth.js (runtime Node,
 * jsonwebtoken) et src/middleware.js (runtime Edge, jose). Aucune des deux
 * libs n'est importée ici : ce module ne fait que lire la config des clés,
 * pas la signature/vérification elle-même.
 */
export function loadJwtKeyConfig() {
  const fallback = process.env.JWT_SECRET;
  const raw = process.env.JWT_SECRETS_JSON;
  if (!raw) return { activeKid: "legacy", keys: { legacy: fallback } };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.active || !parsed?.keys?.[parsed.active]) throw new Error("invalid keys");
    return { activeKid: parsed.active, keys: parsed.keys };
  } catch {
    return { activeKid: "legacy", keys: { legacy: fallback } };
  }
}
