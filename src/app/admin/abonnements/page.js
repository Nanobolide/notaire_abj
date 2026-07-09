"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";
import { formatFcfa } from "@/lib/regles";

const VIDE = { tenant_id: "", plan_id: "", periodicite: "mensuel", montant: "" };
const STATUTS = ["active", "suspendue", "resiliee"];

export default function AdminAbonnements() {
  const [lignes, setLignes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => fetch("/api/saas/subscriptions").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => {
    charger();
    fetch("/api/saas/tenants").then(lireJson).then((d) => !d.erreur && setTenants(d));
    fetch("/api/saas/plans").then(lireJson).then((d) => !d.erreur && setPlans(d));
  }, []);

  const maj = (ch) => (e) => {
    const v = e.target.value;
    if (ch === "plan_id") {
      const plan = plans.find((p) => p.id === v);
      setForm({ ...form, plan_id: v, montant: plan ? String(plan.prix_mensuel) : form.montant });
    } else setForm({ ...form, [ch]: v });
  };

  const creer = async (e) => {
    e.preventDefault();
    if (!form.tenant_id || !form.plan_id) { setErreur("Étude et plan requis."); return; }
    setErreur(""); setEnvoi(true);
    const rep = await fetch("/api/saas/subscriptions", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, montant: Number(form.montant) || 0 }) });
    const d = await lireJson(rep);
    setEnvoi(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setForm(VIDE);
    charger();
  };

  const majStatut = async (s, statut) => {
    const rep = await fetch(`/api/saas/subscriptions/${s.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  return (
    <>
      <h1>Abonnements</h1>
      <p className="sous-titre">Rattache une étude à un plan tarifaire.</p>
      {erreur && <div className="erreur">{erreur}</div>}

      <form className="carte" onSubmit={creer}>
        <h1 style={{ fontSize: 15 }}>Nouvel abonnement</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <label>Étude *
            <select value={form.tenant_id} onChange={maj("tenant_id")} required>
              <option value="">— Choisir —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.nom_tenant}</option>)}
            </select></label>
          <label>Plan *
            <select value={form.plan_id} onChange={maj("plan_id")} required>
              <option value="">— Choisir —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.code})</option>)}
            </select></label>
          <label>Périodicité
            <select value={form.periodicite} onChange={maj("periodicite")}>
              <option value="mensuel">Mensuel</option>
              <option value="annuel">Annuel</option>
            </select></label>
          <label>Montant (FCFA)
            <input type="number" min="0" value={form.montant} onChange={maj("montant")} /></label>
        </div>
        <button className="bouton" disabled={envoi}>{envoi ? "Création…" : "Créer l'abonnement"}</button>
      </form>

      <table className="registre">
        <thead><tr>
          <th>Étude</th><th>Plan</th><th>Périodicité</th><th>Montant</th><th>Statut</th><th>Depuis</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {lignes.map((s) => (
            <tr key={s.id}>
              <td>{s.nom_tenant}</td>
              <td>{s.plan_code}</td>
              <td>{s.periodicite}</td>
              <td>{formatFcfa(s.montant)}</td>
              <td>{s.statut}</td>
              <td>{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
              <td>
                <select value={s.statut} onChange={(e) => majStatut(s, e.target.value)} style={{ fontSize: 11, padding: "3px 6px" }}>
                  {STATUTS.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {!lignes.length && <tr><td colSpan={7} className="sous-titre">Aucun abonnement pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
