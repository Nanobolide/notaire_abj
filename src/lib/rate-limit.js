/**
 * Limiteur de débit EN MÉMOIRE PROCESS (Map), pas distribué.
 *
 * Limites connues, acceptées tant que le déploiement reste mono-instance :
 * - les compteurs sont perdus à chaque redémarrage PM2 (redéploiement, crash) ;
 * - avec plusieurs instances (cluster PM2, plusieurs conteneurs, autoscaling),
 *   chaque process a SA PROPRE Map : la limite réelle devient (max × nb instances),
 *   pas la valeur configurée — aucune coordination entre process.
 * - la Map ne purge jamais les clés expirées : sur un site à fort trafic avec des
 *   clés à forte cardinalité (ex. par IP), elle grossit indéfiniment (fuite mémoire
 *   lente). Acceptable ici : les clés sont bornées (par uid ou par ressource),
 *   pas par IP brute.
 *
 * Si un scale-out horizontal est prévu (plusieurs instances de l'app), remplacer
 * par un compteur Redis (INCR + EXPIRE, ou une lib comme rate-limiter-flexible)
 * pour une limite réellement partagée entre process.
 */
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
