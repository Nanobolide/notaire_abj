"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";
import { formatFcfa } from "@/lib/regles";

const VIDE = { code: "", nom: "", prix_mensuel: "", prix_annuel: "", max_utilisateurs: "10", max_stockage_go: "10" };

export default function AdminPlans() {
  const [lignes, setLignes] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/saas/plans").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => { charger(); }, []);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });

  const creer = async (e) => {
    e.preventDefault();
    setErreur(""); setEnvoi(true);
    const rep = await fetch("/api/saas/plans", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        prix_mensuel: Number(form.prix_mensuel) || 0,
        prix_annuel: Number(form.prix_annuel) || 0,
        max_utilisateurs: Number(form.max_utilisateurs) || 10,
        max_stockage_go: Number(form.max_stockage_go) || 10,
      }) });
    const d = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setForm(VIDE);
    charger();
  };

  const basculerActif = async (p) => {
    const rep = await fetch(`/api/saas/plans/${p.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actif: !p.actif }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  return (
    <>
      <h1>Plans tarifaires</h1>
      <p className="sous-titre">Grille commerciale proposée aux études lors de leur souscription.</p>
      {erreur && <div className="erreur">{erreur}</div>}

      <form className="carte" onSubmit={creer}>
        <h1 style={{ fontSize: 15 }}>Nouveau plan</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <label>Code *
            <input value={form.code} onChange={maj("code")} placeholder="ex. PRO" required /></label>
          <label>Nom *
            <input value={form.nom} onChange={maj("nom")} placeholder="ex. Pro" required /></label>
          <label>Prix mensuel (FCFA)
            <input type="number" min="0" value={form.prix_mensuel} onChange={maj("prix_mensuel")} /></label>
          <label>Prix annuel (FCFA)
            <input type="number" min="0" value={form.prix_annuel} onChange={maj("prix_annuel")} /></label>
          <label>Utilisateurs max
            <input type="number" min="1" value={form.max_utilisateurs} onChange={maj("max_utilisateurs")} /></label>
          <label>Stockage max (Go)
            <input type="number" min="1" value={form.max_stockage_go} onChange={maj("max_stockage_go")} /></label>
        </div>
        <button className="bouton" disabled={envoi}>{envoi ? "Création…" : "Créer le plan"}</button>
      </form>

      <table className="registre">
        <thead><tr>
          <th>Code</th><th>Nom</th><th>Mensuel</th><th>Annuel</th><th>Utilisateurs</th><th>Stockage</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {lignes.map((p) => (
            <tr key={p.id}>
              <td>{p.code}</td>
              <td>{p.nom}</td>
              <td>{formatFcfa(p.prix_mensuel)}</td>
              <td>{formatFcfa(p.prix_annuel)}</td>
              <td>{p.max_utilisateurs}</td>
              <td>{p.max_stockage_go} Go</td>
              <td>{p.actif ? "Actif" : "Retiré"}</td>
              <td>
                <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11 }}
                  onClick={() => basculerActif(p)}>{p.actif ? "Retirer" : "Réactiver"}</button>
              </td>
            </tr>
          ))}
          {!lignes.length && <tr><td colSpan={8} className="sous-titre">Aucun plan pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
