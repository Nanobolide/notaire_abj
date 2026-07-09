"use client";
import { useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

const CATEGORIES = ["Amélioration", "Difficulté rencontrée", "Erreur / bug", "Autre"];
const FONCTIONS = ["Notaire", "Notaire salarié", "Clerc", "Formaliste", "Comptable",
                   "Archiviste", "Secrétariat", "Accueil", "Je préfère ne pas le dire"];

export default function Avis() {
  const [categorie, setCategorie] = useState("Amélioration");
  const [fonction, setFonction] = useState("Je préfère ne pas le dire");
  const [message, setMessage] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");

  const envoyer = async () => {
    setErreur("");
    const rep = await fetch("/api/avis", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, message,
        fonction: fonction === "Je préfère ne pas le dire" ? null : fonction }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setEnvoye(true);
  };

  return (
    <>
      <Entete />
      <main className="page" style={{ maxWidth: 720 }}>
        <h1>Votre avis sur l'application</h1>
        <p className="sous-titre">Vous utilisez NOTARIA tous les jours. Vous voyez ce qu'un développeur
          ne verra jamais. Dites-nous ce qui vous gêne, ce qui manque, ce qui pourrait être plus simple.</p>

        <div className="carte" style={{ background: "#F3F7F4", borderColor: "#BFD9C7" }}>
          <h1 style={{ fontSize: 14, color: "#2E7D32" }}>🔒 Votre message est anonyme</h1>
          <p style={{ fontSize: 12.5, color: "#3A4560", lineHeight: 1.55 }}>
            Nous ne savons pas qui écrit. Ni votre nom, ni votre identifiant, ni le nom de votre étude
            ne sont enregistrés — <strong>rien, dans la base de données, ne relie un avis à une personne.</strong>{" "}
            Vous pouvez indiquer votre fonction (clerc, comptable, accueil…) pour nous aider à situer votre remarque,
            ou ne rien dire du tout. Ni votre Notaire, ni vos collègues ne peuvent lire ces messages.
          </p>
          <p style={{ fontSize: 12, color: "#8A6D1F", marginTop: 8, background: "#FBF6E9",
                      border: "1px solid #E4D3A0", borderRadius: 6, padding: "8px 10px" }}>
            ⚠️ N'écrivez ici <strong>aucun nom de client, aucune référence de dossier, aucun détail d'acte</strong>.
            Ces informations sont couvertes par le secret professionnel et n'ont pas leur place dans un message.
          </p>
        </div>

        {envoye ? (
          <div className="carte">
            <h1 style={{ fontSize: 15, color: "#2E7D32" }}>✅ Merci, votre avis nous est parvenu</h1>
            <p className="sous-titre">Il a été transmis de façon anonyme. Nous le lirons attentivement.</p>
            <button className="bouton secondaire" onClick={() => { setEnvoye(false); setMessage(""); }}>
              Écrire un autre avis</button>
          </div>
        ) : (
          <div className="carte">
            {erreur && <div className="erreur">{erreur}</div>}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
              <label>De quoi s'agit-il ?
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></label>
              <label>Votre fonction (facultatif)
                <select value={fonction} onChange={(e) => setFonction(e.target.value)}>
                  {FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select></label>
            </div>
            <label style={{ display: "block" }}>Votre message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7}
                placeholder="Ce qui vous fait perdre du temps, ce qui n'est pas clair, ce que vous aimeriez voir…"
                style={{ width: "100%", padding: 9, borderRadius: 6, border: "0.5px solid #C9D0DB",
                         fontFamily: "inherit", fontSize: 13, marginTop: 4 }} />
            </label>
            <p className="sous-titre" style={{ marginTop: 4 }}>{message.length} / 4000 caractères</p>
            <button className="bouton" onClick={envoyer} disabled={message.trim().length < 10}
                    style={{ marginTop: 8 }}>Envoyer mon avis anonymement</button>
          </div>
        )}
      </main>
    </>
  );
}
