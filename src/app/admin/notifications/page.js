"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";

const VIDE = { tenant_id: "", canal: "in_app", cible: "", sujet: "", message: "" };

export default function AdminNotifications() {
  const [lignes, setLignes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/saas/notifications").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => {
    charger();
    fetch("/api/saas/tenants").then(lireJson).then((d) => !d.erreur && setTenants(d));
  }, []);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });

  const envoyer = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { setErreur("Le message est requis."); return; }
    setErreur(""); setEnvoi(true);
    const rep = await fetch("/api/saas/notifications", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tenant_id: form.tenant_id || null }) });
    const d = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setForm(VIDE);
    charger();
  };

  const marquerEnvoyee = async (n) => {
    const rep = await fetch(`/api/saas/notifications/${n.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "sent" }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  return (
    <>
      <h1>Notifications</h1>
      <p className="sous-titre">Message diffusé à une étude en particulier, ou à toute la plateforme si aucune n'est choisie.</p>
      {erreur && <div className="erreur">{erreur}</div>}

      <form className="carte" onSubmit={envoyer}>
        <h1 style={{ fontSize: 15 }}>Nouvelle notification</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <label>Étude (facultatif)
            <select value={form.tenant_id} onChange={maj("tenant_id")}>
              <option value="">— Toutes les études —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.nom_tenant}</option>)}
            </select></label>
          <label>Canal
            <select value={form.canal} onChange={maj("canal")}>
              <option value="in_app">In-app</option>
              <option value="email">E-mail</option>
            </select></label>
          <label>Sujet
            <input value={form.sujet} onChange={maj("sujet")} placeholder="ex. Maintenance planifiée" /></label>
        </div>
        <label style={{ display: "block", marginTop: 10 }}>Message *
          <textarea value={form.message} onChange={maj("message")} rows={3} style={{ width: "100%" }} required /></label>
        <button className="bouton" disabled={envoi}>{envoi ? "Envoi…" : "Envoyer"}</button>
      </form>

      <table className="registre">
        <thead><tr>
          <th>Étude</th><th>Canal</th><th>Sujet</th><th>Message</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {lignes.map((n) => (
            <tr key={n.id}>
              <td>{tenants.find((t) => t.id === n.tenant_id)?.nom_tenant || "Toutes"}</td>
              <td>{n.canal}</td>
              <td>{n.sujet || "—"}</td>
              <td style={{ maxWidth: 300 }}>{n.message}</td>
              <td>{n.statut}</td>
              <td>
                {n.statut !== "sent" && (
                  <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11 }}
                    onClick={() => marquerEnvoyee(n)}>Marquer envoyée</button>
                )}
              </td>
            </tr>
          ))}
          {!lignes.length && <tr><td colSpan={6} className="sous-titre">Aucune notification pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
