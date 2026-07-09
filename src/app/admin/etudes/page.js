"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";

const VIDE = {
  nom_etude: "", adresse: "", email_notaire: "",
  identifiant_notaire: "", nom_affiche_notaire: "", nom_complet_notaire: "",
  plan_id: "",
};

export default function AdminEtudes() {
  const [lignes, setLignes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [creation, setCreation] = useState(false);
  const [identifiants, setIdentifiants] = useState(null);

  const charger = () => fetch("/api/saas/tenants").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => { charger(); fetch("/api/saas/plans").then(lireJson).then((d) => !d.erreur && setPlans(d)); }, []);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });

  const creer = async (e) => {
    e.preventDefault();
    setErreur(""); setInfo(""); setCreation(true);
    const rep = await fetch("/api/saas/tenants", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, plan_id: form.plan_id || null }) });
    const d = await lireJson(rep);
    setCreation(false);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setIdentifiants({ identifiant: d.identifiant, mdp: d.motDePasseProvisoire, etude: d.etude.nom });
    setForm(VIDE);
    charger();
  };

  const basculerStatut = async (t) => {
    const nouveau = t.statut === "actif" ? "suspendu" : "actif";
    if (nouveau === "suspendu" && !confirm(`Suspendre l'étude « ${t.nom_tenant} » ? Ses utilisateurs perdront l'accès immédiatement.`)) return;
    setErreur("");
    const rep = await fetch(`/api/saas/tenants/${t.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: nouveau }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  const copier = async (txt) => {
    try { await navigator.clipboard.writeText(txt); setInfo("Copié dans le presse-papiers."); }
    catch { setInfo("Copie impossible — sélectionnez le texte à la main."); }
  };

  return (
    <>
      <h1>Études (tenants)</h1>
        <p className="sous-titre">
          Chaque étude est un cabinet notarial client, isolé des autres. La création provisionne
          l'étude, son compte Notaire administrateur et ses référentiels de base.
        </p>

        {erreur && <div className="erreur">{erreur}</div>}
        {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

        {identifiants && (
          <div className="carte" style={{ background: "#FBF9F2", borderColor: "#E4D3A0" }}>
            <h1 style={{ fontSize: 15, color: "#8A6D1F" }}>🔑 Étude « {identifiants.etude} » créée</h1>
            <p className="sous-titre">Identifiants du compte Notaire, à transmettre maintenant — le mot de passe
              ne sera plus jamais affiché.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ background: "#fff", border: "1px solid #E4D3A0", borderRadius: 6, padding: "9px 14px" }}>
                {identifiants.identifiant} / {identifiants.mdp}
              </code>
              <button className="bouton secondaire" onClick={() => copier(`${identifiants.identifiant} / ${identifiants.mdp}`)}>📋 Copier</button>
              <button className="bouton" onClick={() => setIdentifiants(null)}>J'ai noté, fermer</button>
            </div>
          </div>
        )}

        <form className="carte" onSubmit={creer}>
          <h1 style={{ fontSize: 15 }}>Nouvelle étude</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label>Nom de l'étude *
              <input value={form.nom_etude} onChange={maj("nom_etude")} placeholder="ex. Étude de Me DIABATE" required /></label>
            <label>Adresse
              <input value={form.adresse} onChange={maj("adresse")} placeholder="ex. Abidjan, Côte d'Ivoire" /></label>
            <label>E-mail du Notaire
              <input type="email" value={form.email_notaire} onChange={maj("email_notaire")} placeholder="notaire@example.com" /></label>
            <label>Plan tarifaire
              <select value={form.plan_id} onChange={maj("plan_id")}>
                <option value="">— Aucun (à définir plus tard) —</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.code})</option>)}
              </select></label>
            <label>Identifiant de connexion du Notaire *
              <input value={form.identifiant_notaire} onChange={maj("identifiant_notaire")} placeholder="ex. diabate.notaire" required /></label>
            <label>Nom affiché du Notaire *
              <input value={form.nom_affiche_notaire} onChange={maj("nom_affiche_notaire")} placeholder="ex. Me DIABATE" required /></label>
            <label>Nom et prénom (état civil)
              <input value={form.nom_complet_notaire} onChange={maj("nom_complet_notaire")} placeholder="ex. DIABATE Issa" /></label>
          </div>
          <p className="sous-titre" style={{ marginTop: 8 }}>
            Un mot de passe provisoire est généré automatiquement et affiché une seule fois après création.
          </p>
          <button className="bouton" disabled={creation}>{creation ? "Création…" : "Créer l'étude"}</button>
        </form>

        <table className="registre">
          <thead><tr>
            <th>Étude</th><th>Contact</th><th>Statut tenant</th><th>Accès étude</th><th>Créée le</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {lignes.map((t) => (
              <tr key={t.id}>
                <td>{t.nom_tenant}</td>
                <td>{t.contact_nom || "—"}<br /><span className="sous-titre" style={{ margin: 0 }}>{t.contact_email || ""}</span></td>
                <td>{t.statut}</td>
                <td>{t.etude_statut === "active" ? "✅ Active" : "⛔ Désactivée"}</td>
                <td>{t.cree_le ? new Date(t.cree_le).toLocaleDateString("fr-FR") : "—"}</td>
                <td>
                  <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11 }}
                    onClick={() => basculerStatut(t)}>
                    {t.statut === "actif" ? "Suspendre" : "Réactiver"}
                  </button>
                </td>
              </tr>
            ))}
            {!lignes.length && <tr><td colSpan={6} className="sous-titre">Aucune étude pour l'instant.</td></tr>}
          </tbody>
        </table>
    </>
  );
}
