"use client";
/**
 * P0.1 — Filet de sécurité global. Une donnée manquante ne doit plus jamais
 * faire disparaître une page entière derrière un écran blanc.
 */
export default function Erreur({ error, reset }) {
  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="carte" style={{ borderColor: "#E0B4B4", background: "#FDF3F3" }}>
        <h1 style={{ fontSize: 16, color: "#B03030" }}>Cette page n'a pas pu s'afficher</h1>
        <p className="sous-titre">Vos données sont intactes : rien n'a été perdu ni modifié.
          Vous pouvez réessayer, ou revenir en arrière.</p>
        <p style={{ fontSize: 11, color: "#8A94A8", fontFamily: "monospace", marginBottom: 12 }}>
          {error?.message || "Erreur inattendue"}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bouton" onClick={() => reset()}>Réessayer</button>
          <a className="bouton secondaire" href="/tableau-de-bord">Retour au tableau de bord</a>
        </div>
      </div>
    </main>
  );
}
