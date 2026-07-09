"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

const VIDE = { identifiant: "", nom_affiche: "", fonction: "", motDePasseProvisoire: "" };

export default function Comptes() {
  const [comptes, setComptes] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");

  const charger = () => fetch("/api/comptes").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setComptes(d)));
  useEffect(() => { charger(); }, []);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });

  const creer = async (e) => {
    e.preventDefault(); setErreur(""); setInfo("");
    const rep = await fetch("/api/comptes", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo(`Compte « ${d.identifiant} » créé. Transmettez le mot de passe provisoire de vive voix — il devra être changé à la première connexion.`);
    setForm(VIDE); charger();
  };

  const action = async (id, act) => {
    setErreur(""); setInfo("");
    let corps = { action: act };
    if (act === "reinitialiser") {
      const mdp = prompt("Nouveau mot de passe PROVISOIRE (au moins 8 caractères) :");
      if (!mdp) return;
      corps.motDePasseProvisoire = mdp;
    }
    const rep = await fetch(`/api/comptes/${id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Action effectuée."); charger();
  };

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Comptes de l'étude</h1>
        <p className="sous-titre">Créez, désactivez, déverrouillez les accès de vos collaborateurs. Les mots de passe se transmettent de vive voix, jamais par e-mail.</p>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Nouveau collaborateur</h1>
          <form className="saisie" onSubmit={creer}>
            <label>Identifiant de connexion *
              <input value={form.identifiant} onChange={maj("identifiant")} placeholder="ex. clerc4" required /></label>
            <label>Nom affiché *
              <input value={form.nom_affiche} onChange={maj("nom_affiche")} placeholder="ex. Mme Koffi Awa" required /></label>
            <label>Fonction
              <input value={form.fonction} onChange={maj("fonction")} placeholder="ex. Clerc, Stagiaire, Accueil…" /></label>
            <label>Mot de passe provisoire * (8 caractères min.)
              <input type="password" value={form.motDePasseProvisoire} onChange={maj("motDePasseProvisoire")} required /></label>
            <div><button className="bouton">Créer le compte</button></div>
          </form>
          {erreur && <div className="erreur">{erreur}</div>}
          {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}
        </div>

        <table className="registre">
          <thead><tr><th>Identifiant</th><th>Nom</th><th>Fonction</th><th>Rôle</th><th>État</th><th>Actions</th></tr></thead>
          <tbody>
            {comptes.map((u) => (
              <tr key={u.id} style={{ background: !u.actif ? "#F2F2F2" : u.verrouille ? "#FFF4C2" : undefined }}>
                <td>{u.identifiant}</td>
                <td>{u.nom_affiche}</td>
                <td>{u.fonction || "—"}</td>
                <td>{u.role === "admin_etude" ? "Notaire (admin)" : "Collaborateur"}</td>
                <td>{!u.actif ? "Désactivé" : u.verrouille ? "🔒 Verrouillé" : u.doit_changer_mdp ? "Mdp provisoire" : "Actif"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {u.verrouille && <button className="bouton secondaire" style={{ padding: "3px 8px", marginRight: 4 }}
                    onClick={() => action(u.id, "deverrouiller")}>Déverrouiller</button>}
                  <button className="bouton secondaire" style={{ padding: "3px 8px", marginRight: 4 }}
                    onClick={() => action(u.id, "reinitialiser")}>Réinit. mdp</button>
                  {u.role !== "admin_etude" && (u.actif
                    ? <button className="bouton secondaire" style={{ padding: "3px 8px" }}
                        onClick={() => action(u.id, "desactiver")}>Désactiver</button>
                    : <button className="bouton secondaire" style={{ padding: "3px 8px" }}
                        onClick={() => action(u.id, "reactiver")}>Réactiver</button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
