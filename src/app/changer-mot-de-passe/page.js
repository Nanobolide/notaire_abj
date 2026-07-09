"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { lireJson } from "@/lib/http";

export default function ChangerMotDePasse() {
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirme, setConfirme] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const routeur = useRouter();

  const soumettre = async (e) => {
    e.preventDefault(); setErreur("");
    if (nouveau !== confirme) { setErreur("La confirmation ne correspond pas au nouveau mot de passe."); return; }
    setEnvoi(true);
    const rep = await fetch("/api/auth/mot-de-passe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actuel, nouveau }),
    });
    const data = await lireJson(rep);
    if (!rep.ok) { setErreur(data.erreur || "Changement impossible."); setEnvoi(false); return; }
    routeur.push("/tableau-de-bord");
  };

  return (
    <div className="connexion-fond">
      <div className="connexion-boite">
        <h1>NOTARIA</h1>
        <p className="sous-titre">
          <strong>Première connexion : changez votre mot de passe.</strong><br />
          Au moins 8 caractères, avec lettres et chiffres.
        </p>
        <form onSubmit={soumettre}>
          <input type="password" placeholder="Mot de passe actuel" value={actuel}
                 onChange={(e) => setActuel(e.target.value)} autoFocus />
          <input type="password" placeholder="Nouveau mot de passe" value={nouveau}
                 onChange={(e) => setNouveau(e.target.value)} />
          <input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirme}
                 onChange={(e) => setConfirme(e.target.value)} />
          {erreur && <div className="erreur">{erreur}</div>}
          <button className="bouton" disabled={envoi}>{envoi ? "Enregistrement…" : "Changer le mot de passe"}</button>
        </form>
      </div>
    </div>
  );
}
