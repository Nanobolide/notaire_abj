/** Lit une réponse HTTP sans jamais planter, même si le corps est vide ou non-JSON. */
export async function lireJson(rep) {
  const texte = await rep.text();
  try { return texte ? JSON.parse(texte) : {}; }
  catch { return { erreur: `Réponse illisible du serveur (HTTP ${rep.status}).` }; }
}
