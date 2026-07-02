"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Connexion() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const routeur = useRouter();

  const soumettre = async (e) => {
    e.preventDefault();
    setEnvoi(true); setErreur("");
    const rep = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, motDePasse }),
    });
    const data = await rep.json();
    if (!rep.ok) { setErreur(data.erreur || "Connexion impossible."); setEnvoi(false); return; }
    routeur.push("/tableau-de-bord");
  };

  return (
    <div className="connexion-fond">
      <div className="connexion-boite">
        <h1>NOTARIA</h1>
        <p className="sous-titre">Gestion notariale — connexion à votre étude</p>
        <form onSubmit={soumettre}>
          <input placeholder="Identifiant (ex. clerc1)" value={identifiant}
                 onChange={(e) => setIdentifiant(e.target.value)} autoFocus />
          <input type="password" placeholder="Mot de passe" value={motDePasse}
                 onChange={(e) => setMotDePasse(e.target.value)} />
          {erreur && <div className="erreur">{erreur}</div>}
          <button className="bouton" disabled={envoi}>
            {envoi ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="sous-titre" style={{ marginTop: 14 }}>
          Mot de passe oublié ? Adressez-vous au Notaire de votre étude —
          la réinitialisation ne passe jamais par e-mail.
        </p>
      </div>
    </div>
  );
}
