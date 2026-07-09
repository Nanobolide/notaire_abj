"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";

const VIDE = { tenant_id: "", quota_utilisateurs: "10", quota_stockage_go: "10", expire_le: "" };

export default function AdminLicences() {
  const [lignes, setLignes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/saas/licenses").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => {
    charger();
    fetch("/api/saas/tenants").then(lireJson).then((d) => !d.erreur && setTenants(d));
  }, []);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });

  const creer = async (e) => {
    e.preventDefault();
    if (!form.tenant_id) { setErreur("Étude requise."); return; }
    setErreur(""); setEnvoi(true);
    const rep = await fetch("/api/saas/licenses", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quota_utilisateurs: Number(form.quota_utilisateurs) || 10,
        quota_stockage_go: Number(form.quota_stockage_go) || 10,
        expire_le: form.expire_le || null,
      }) });
    const d = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setForm(VIDE);
    charger();
  };

  const revoquer = async (l) => {
    if (!confirm(`Révoquer la licence « ${l.cle_licence} » ?`)) return;
    const rep = await fetch(`/api/saas/licenses/${l.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: l.statut === "active" ? "revoquee" : "active" }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  return (
    <>
      <h1>Licences</h1>
      <p className="sous-titre">Clé d'activation et quotas techniques par étude.</p>
      {erreur && <div className="erreur">{erreur}</div>}

      <form className="carte" onSubmit={creer}>
        <h1 style={{ fontSize: 15 }}>Nouvelle licence</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <label>Étude *
            <select value={form.tenant_id} onChange={maj("tenant_id")} required>
              <option value="">— Choisir —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.nom_tenant}</option>)}
            </select></label>
          <label>Quota utilisateurs
            <input type="number" min="1" value={form.quota_utilisateurs} onChange={maj("quota_utilisateurs")} /></label>
          <label>Quota stockage (Go)
            <input type="number" min="1" value={form.quota_stockage_go} onChange={maj("quota_stockage_go")} /></label>
          <label>Expire le
            <input type="date" value={form.expire_le} onChange={maj("expire_le")} /></label>
        </div>
        <button className="bouton" disabled={envoi}>{envoi ? "Création…" : "Générer la licence"}</button>
      </form>

      <table className="registre">
        <thead><tr>
          <th>Étude</th><th>Clé</th><th>Utilisateurs</th><th>Stockage</th><th>Expire le</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id}>
              <td>{l.nom_tenant}</td>
              <td><code>{l.cle_licence}</code></td>
              <td>{l.quota_utilisateurs}</td>
              <td>{l.quota_stockage_go} Go</td>
              <td>{l.expire_le ? new Date(l.expire_le).toLocaleDateString("fr-FR") : "—"}</td>
              <td>{l.statut}</td>
              <td>
                <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11 }}
                  onClick={() => revoquer(l)}>{l.statut === "active" ? "Révoquer" : "Réactiver"}</button>
              </td>
            </tr>
          ))}
          {!lignes.length && <tr><td colSpan={7} className="sous-titre">Aucune licence pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
