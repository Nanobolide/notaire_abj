"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { lireJson } from "@/lib/http";

function arriver(routeur, data) {
  if (data.doitChangerMdp) { routeur.push("/changer-mot-de-passe"); return; }
  routeur.push(data.role === "super_admin" ? "/admin" : "/tableau-de-bord");
}

export default function Connexion() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [challenge, setChallenge] = useState(null); // { challengeToken, method }
  const [code, setCode] = useState("");
  const routeur = useRouter();

  const soumettre = async (e) => {
    e.preventDefault();
    setEnvoi(true); setErreur("");
    const rep = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, motDePasse }),
    });
    const data = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(data.erreur || "Connexion impossible."); return; }
    if (data.mfaRequired) { setChallenge({ challengeToken: data.challengeToken, method: data.method }); return; }
    arriver(routeur, data);
  };

  const valider2fa = async (e) => {
    e.preventDefault();
    setEnvoi(true); setErreur("");
    const rep = await fetch("/api/auth/mfa/verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken: challenge.challengeToken, code }),
    });
    const data = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(data.erreur || "Code invalide."); return; }
    arriver(routeur, data);
  };

  if (challenge) {
    return (
      <div className="connexion-fond">
        <div className="connexion-boite">
          <h1>NOTARIA</h1>
          <p className="sous-titre">Validation en deux étapes — code de votre application d'authentification</p>
          <form onSubmit={valider2fa}>
            <input placeholder="Code à 6 chiffres" value={code} inputMode="numeric" autoFocus
                   onChange={(e) => setCode(e.target.value)} />
            {erreur && <div className="erreur">{erreur}</div>}
            <button className="bouton" disabled={envoi}>{envoi ? "Vérification…" : "Valider"}</button>
          </form>
          <p style={{ marginTop: 10, fontSize: 13 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setChallenge(null); setCode(""); setErreur(""); }}>
              ← Revenir à l'identifiant / mot de passe</a>
          </p>
        </div>
      </div>
    );
  }

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
        <p style={{ marginTop: 10, fontSize: 13 }}><a href="/mot-de-passe-oublie">Mot de passe oublié ?</a></p>
        <p className="sous-titre" style={{ marginTop: 14 }}>
          Mot de passe oublié ? Adressez-vous au Notaire de votre étude —
          la réinitialisation ne passe jamais par e-mail.
        </p>
      </div>
    </div>
  );
}
