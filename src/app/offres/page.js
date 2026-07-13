"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

const fcfa = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR") + " F");

export default function Offres() {
  const [etat, setEtat] = useState(null);      // null = chargement
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({ sens: "vente", titre: "", description: "", ville: "", prix: "", contact: "" });
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");

  const charger = () => fetch("/api/offres").then(lireJson).then(setEtat).catch(() => setEtat({ actif: false, offres: [] }));
  useEffect(() => { charger(); fetch("/api/session").then(lireJson).then(setSession); }, []);

  const peutPublier = session && ["administrateur", "notaire_salarie"].includes(
    session.niveauAcces || (session.role === "admin_etude" ? "administrateur" : "standard"));

  const publier = async () => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/offres", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Offre publiée."); setForm({ sens: "vente", titre: "", description: "", ville: "", prix: "", contact: "" });
    setOuvert(false); charger();
  };

  if (etat === null) return (<><Entete /><main className="page"><p className="sous-titre">Chargement…</p></main></>);

  if (!etat.actif) return (<><Entete /><main className="page">
    <div className="carte"><h1 style={{ fontSize: 15 }}>Offres immobilières</h1>
      <p className="sous-titre">Ce service n'est pas encore activé sur la plateforme.</p></div></main></>);

  if (etat.autorise === false) return (<><Entete /><main className="page">
    <div className="carte" style={{ borderColor: "#E4D3A0", background: "#FBF9F2" }}>
      <h1 style={{ fontSize: 15, color: "#8A6D1F" }}>Offres immobilières — forfait requis</h1>
      <p className="sous-titre">Les propositions de vente et d'achat sont réservées aux forfaits Pro et Pro Max.</p>
    </div></main></>);

  return (<><Entete /><main className="page">
    <h1>Offres immobilières</h1>
    <p className="sous-titre">Propositions de vente et d'achat entre études. Ne mentionnez jamais le nom
      d'un client : seulement le bien, la ville, un prix indicatif et le contact de votre étude.</p>
    {erreur && <div className="erreur">{erreur}</div>}
    {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

    {peutPublier && (
      <div style={{ marginBottom: 14 }}>
        <button className="bouton" onClick={() => setOuvert(!ouvert)}>{ouvert ? "− Annuler" : "+ Publier une offre"}</button>
      </div>
    )}
    {ouvert && peutPublier && (
      <div className="carte">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 14 }}>
          <label>Type
            <select value={form.sens} onChange={(e) => setForm({ ...form, sens: e.target.value })}>
              <option value="vente">Proposition de vente</option>
              <option value="achat">Proposition d'achat</option>
            </select></label>
          <label>Titre du bien
            <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                   placeholder="ex. Villa 4 pièces avec jardin" /></label>
          <label>Ville
            <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
                   placeholder="ex. Cocody" /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <label>Prix indicatif (FCFA)
            <input type="number" min="0" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} /></label>
          <label>Contact de l'étude
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                   placeholder="ex. secretariat@etude-kouassi.ci" /></label>
        </div>
        <label style={{ display: "block", marginTop: 12 }}>Description (sans nom de client)
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} style={{ width: "100%", resize: "vertical" }} /></label>
        <p style={{ marginTop: 12 }}><button className="bouton" onClick={publier}>Publier</button></p>
      </div>
    )}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 8 }}>
      {(etat.offres || []).map((o) => (
        <div key={o.id} className="carte" style={{ margin: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: o.type === "proposition_vente" ? "#2E7D32" : "#1F3864" }}>
            {o.type === "proposition_vente" ? "À VENDRE" : "RECHERCHE"}
          </span>
          <h1 style={{ fontSize: 15, margin: "4px 0" }}>{o.titre}</h1>
          <p style={{ fontSize: 12.5, color: "#5A6478", margin: "0 0 6px" }}>{o.bien_ville} · {fcfa(o.bien_prix)}</p>
          {o.message && <p style={{ fontSize: 12.5, margin: "0 0 8px" }}>{o.message}</p>}
          {o.contact_etude && <p style={{ fontSize: 11.5, color: "#8A6D1F" }}>Contact : {o.contact_etude}</p>}
        </div>
      ))}
      {(etat.offres || []).length === 0 && <p className="sous-titre">Aucune offre pour l'instant.</p>}
    </div>
  </main></>);
}
