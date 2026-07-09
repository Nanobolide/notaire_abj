"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";

export default function AdminParametres() {
  const [reglages, setReglages] = useState({});
  const [cle, setCle] = useState("");
  const [valeur, setValeur] = useState("");
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/saas/settings").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setReglages(d)));
  useEffect(() => { charger(); }, []);

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!cle.trim()) { setErreur("La clé est requise."); return; }
    let v;
    try { v = JSON.parse(valeur); }
    catch { v = valeur; } // valeur texte simple si ce n'est pas du JSON valide
    setErreur(""); setInfo(""); setEnvoi(true);
    const rep = await fetch("/api/saas/settings", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [cle.trim()]: v }) });
    const d = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Réglage enregistré."); setCle(""); setValeur("");
    charger();
  };

  return (
    <>
      <h1>Réglages globaux</h1>
      <p className="sous-titre">Paramètres transverses de la plateforme, stockés clé / valeur (JSON libre).</p>
      {erreur && <div className="erreur">{erreur}</div>}
      {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

      <form className="carte" onSubmit={enregistrer}>
        <h1 style={{ fontSize: 15 }}>Ajouter / modifier un réglage</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <label>Clé
            <input value={cle} onChange={(e) => setCle(e.target.value)} placeholder="ex. platform.maintenance" /></label>
          <label>Valeur (JSON ou texte)
            <input value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder='ex. {"actif": true} ou un texte simple' /></label>
        </div>
        <button className="bouton" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer"}</button>
      </form>

      <table className="registre">
        <thead><tr><th>Clé</th><th>Valeur</th></tr></thead>
        <tbody>
          {Object.entries(reglages).map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td><code>{typeof v === "string" ? v : JSON.stringify(v)}</code></td>
            </tr>
          ))}
          {!Object.keys(reglages).length && <tr><td colSpan={2} className="sous-titre">Aucun réglage pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
