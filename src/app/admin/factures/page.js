"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";
import { formatFcfa } from "@/lib/regles";

const VIDE = { tenant_id: "", reference: "", montant: "", echeance_le: "" };

export default function AdminFactures() {
  const [lignes, setLignes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/saas/invoices").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => {
    charger();
    fetch("/api/saas/tenants").then(lireJson).then((d) => !d.erreur && setTenants(d));
  }, []);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });

  const creer = async (e) => {
    e.preventDefault();
    if (!form.tenant_id || !form.reference.trim()) { setErreur("Étude et référence requises."); return; }
    setErreur(""); setEnvoi(true);
    const rep = await fetch("/api/saas/invoices", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, montant: Number(form.montant) || 0, echeance_le: form.echeance_le || null }) });
    const d = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setForm(VIDE);
    charger();
  };

  const marquerPayee = async (f) => {
    const rep = await fetch(`/api/saas/invoices/${f.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "payee", payee_le: new Date().toISOString().slice(0, 10) }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  return (
    <>
      <h1>Factures</h1>
      <p className="sous-titre">Facturation SaaS émise aux études (indépendante de la comptabilité interne de chaque étude).</p>
      {erreur && <div className="erreur">{erreur}</div>}

      <form className="carte" onSubmit={creer}>
        <h1 style={{ fontSize: 15 }}>Nouvelle facture</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <label>Étude *
            <select value={form.tenant_id} onChange={maj("tenant_id")} required>
              <option value="">— Choisir —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.nom_tenant}</option>)}
            </select></label>
          <label>Référence *
            <input value={form.reference} onChange={maj("reference")} placeholder="ex. INV-2026-001" required /></label>
          <label>Montant (FCFA)
            <input type="number" min="0" value={form.montant} onChange={maj("montant")} /></label>
          <label>Échéance
            <input type="date" value={form.echeance_le} onChange={maj("echeance_le")} /></label>
        </div>
        <button className="bouton" disabled={envoi}>{envoi ? "Création…" : "Émettre la facture"}</button>
      </form>

      <table className="registre">
        <thead><tr>
          <th>Étude</th><th>Référence</th><th>Montant</th><th>Échéance</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {lignes.map((f) => (
            <tr key={f.id}>
              <td>{f.nom_tenant}</td>
              <td>{f.reference}</td>
              <td>{formatFcfa(f.montant)} {f.devise}</td>
              <td>{f.echeance_le ? new Date(f.echeance_le).toLocaleDateString("fr-FR") : "—"}</td>
              <td>{f.statut}</td>
              <td>
                {f.statut !== "payee" && (
                  <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11 }}
                    onClick={() => marquerPayee(f)}>Marquer payée</button>
                )}
              </td>
            </tr>
          ))}
          {!lignes.length && <tr><td colSpan={6} className="sous-titre">Aucune facture pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
