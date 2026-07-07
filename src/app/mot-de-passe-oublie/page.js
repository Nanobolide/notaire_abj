"use client";
import { useState } from "react";
import { lireJson } from "@/lib/http";

export default function MotDePasseOublie() {
  const [identifiant, setIdentifiant] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault(); setEnvoi(true);
    const rep = await fetch("/api/recuperation", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifiant }) });
    const d = await lireJson(rep);
    setMessage(d.message || d.erreur); setEnvoi(false);
  };

  return (
    <div className="connexion-fond">
      <div className="connexion-boite">
        <h1>NOTARIA</h1>
        <p className="sous-titre">Mot de passe oublié (Notaire). Pour votre sécurité, la réinitialisation
        se fait avec l'équipe technique, après confirmation de votre identité de vive voix — ainsi, un simple
        accès à votre téléphone ne suffit pas à prendre la main sur l'étude.</p>
        {message ? <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{message}</p> : (
          <form onSubmit={soumettre}>
            <input placeholder="Votre identifiant" value={identifiant}
                   onChange={(e) => setIdentifiant(e.target.value)} autoFocus />
            <button className="bouton" disabled={envoi}>{envoi ? "Envoi…" : "Demander une récupération"}</button>
          </form>
        )}
        <p style={{ marginTop: 12 }}><a href="/connexion">← Retour à la connexion</a></p>
      </div>
    </div>
  );
}
