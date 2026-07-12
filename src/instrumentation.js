/**
 * Point d'entrée Next.js (convention instrumentation.js). Reste volontairement
 * minimal et sans import statique de "pg" : ce fichier est aussi bundlé pour le
 * runtime Edge (middleware), qui ne peut pas résoudre les modules Node natifs
 * (fs, net...) dont dépend "pg". Le vrai self-check vit dans
 * instrumentation-node.js, chargé dynamiquement UNIQUEMENT en runtime Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runSelfCheck } = await import("./instrumentation-node.js");
    await runSelfCheck();
  }
}
