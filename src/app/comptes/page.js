"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

const FONCTIONS = [
  "Notaire principal", "Notaire salarié", "Clerc de 1ère catégorie",
  "Clerc 2", "Clerc 3", "Clerc 4", "Clerc 5",
  "Formaliste", "Comptable", "Archiviste", "Secrétariat", "Accueil",
];

const NIVEAUX = [
  { v: "administrateur", t: "Administrateur — tous les droits" },
  { v: "notaire_salarie", t: "Notaire salarié — tout sauf comptes et paramètres" },
  { v: "comptable", t: "Comptable — financier, sans le contenu des dossiers" },
  { v: "standard", t: "Standard — registres, aucun montant" },
];

const NIVEAU_SUGGERE = {
  "Notaire principal": "administrateur",
  "Notaire salarié": "notaire_salarie",
  "Comptable": "comptable",
};

const VIDE = { identifiant: "", nom_affiche: "", nom_complet: "", fonction: "Clerc de 1ère catégorie",
  niveau_acces: "standard", motDePasseProvisoire: "" };

function genererMotDePasse() {
  const lettres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const chiffres = "23456789";
  const tout = lettres + chiffres;
  let mdp = lettres[Math.floor(Math.random() * lettres.length)] +
            chiffres[Math.floor(Math.random() * chiffres.length)];
  for (let i = 0; i < 8; i++) mdp += tout[Math.floor(Math.random() * tout.length)];
  return mdp.split("").sort(() => Math.random() - 0.5).join("");
}

function ChampMdp({ valeur, onChange, requis }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={visible ? "text" : "password"} value={valeur} onChange={onChange}
             required={requis} style={{ paddingRight: 34, width: "100%" }} />
      <button type="button" onClick={() => setVisible(!visible)} title={visible ? "Masquer" : "Afficher"}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 5px" }}>
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}

export default function Comptes() {
  const [lignes, setLignes] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [enEdition, setEnEdition] = useState(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [mdpAffiche, setMdpAffiche] = useState(null);

  const charger = () => fetch("/api/comptes").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => { charger(); }, []);

  const maj = (ch) => (e) => {
    const v = e.target.value;
    if (ch === "fonction" && NIVEAU_SUGGERE[v] && !enEdition)
      setForm({ ...form, fonction: v, niveau_acces: NIVEAU_SUGGERE[v] });
    else setForm({ ...form, [ch]: v });
  };

  const generer = () => {
    setForm({ ...form, motDePasseProvisoire: genererMotDePasse() });
    setInfo("Mot de passe généré. Il sera affiché une seule fois après la création.");
  };

  const copier = async (txt) => {
    try { await navigator.clipboard.writeText(txt); setInfo("Copié dans le presse-papiers."); }
    catch { setInfo("Copie impossible — sélectionnez le texte à la main."); }
  };

  const creer = async () => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/comptes", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setMdpAffiche({ identifiant: form.identifiant, mdp: form.motDePasseProvisoire });
    setForm(VIDE);
    charger();
  };

  const enregistrerModif = async () => {
    setErreur(""); setInfo("");
    const rep = await fetch(`/api/comptes/${enEdition}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "modifier", nom_affiche: form.nom_affiche,
        nom_complet: form.nom_complet, fonction: form.fonction, niveau_acces: form.niveau_acces }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setEnEdition(null); setForm(VIDE); setInfo("Compte modifié."); charger();
  };

  const modifier = (u) => {
    setEnEdition(u.id);
    setForm({ identifiant: u.identifiant, nom_affiche: u.nom_affiche || "", nom_complet: u.nom_complet || "",
      fonction: u.fonction || "Clerc de 1ère catégorie", niveau_acces: u.niveau_acces || "standard",
      motDePasseProvisoire: "" });
    setErreur(""); setInfo("");
  };

  const action = async (id, act) => {
    setErreur(""); setInfo("");
    const corps = { action: act };
    if (act === "reinitialiser") corps.motDePasseProvisoire = genererMotDePasse();
    const rep = await fetch(`/api/comptes/${id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    if (act === "reinitialiser") {
      const u = lignes.find((x) => x.id === id);
      setMdpAffiche({ identifiant: u?.identifiant, mdp: corps.motDePasseProvisoire });
    }
    charger();
  };

  const supprimer = async (u) => {
    if (!confirm(`Supprimer définitivement le compte « ${u.identifiant} » ? Action irréversible.`)) return;
    setErreur(""); setInfo("");
    const rep = await fetch(`/api/comptes/${u.id}`, { method: "DELETE" });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Compte supprimé."); charger();
  };

  const libelleNiveau = (n) => (NIVEAUX.find((x) => x.v === n)?.t || n || "standard").split(" — ")[0];

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Comptes de l'étude</h1>
        <p className="sous-titre">Créez, modifiez, désactivez les accès de vos collaborateurs.
          Les mots de passe ne sont jamais stockés en clair : un code provisoire est généré, affiché une seule fois,
          puis changé par le collaborateur à sa première connexion.</p>

        {erreur && <div className="erreur">{erreur}</div>}
        {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

        {mdpAffiche && (
          <div className="carte" style={{ background: "#FBF9F2", borderColor: "#E4D3A0" }}>
            <h1 style={{ fontSize: 15, color: "#8A6D1F" }}>🔑 Mot de passe provisoire — à transmettre maintenant</h1>
            <p className="sous-titre">Pour le compte <strong>{mdpAffiche.identifiant}</strong>.
              Il ne sera plus jamais affiché. Communiquez-le de vive voix, jamais par e-mail.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ background: "#fff", border: "1px solid #E4D3A0", borderRadius: 6,
                padding: "9px 14px", fontSize: 16, letterSpacing: 1 }}>{mdpAffiche.mdp}</code>
              <button className="bouton secondaire" onClick={() => copier(mdpAffiche.mdp)}>📋 Copier</button>
              <button className="bouton" onClick={() => setMdpAffiche(null)}>J'ai noté, fermer</button>
            </div>
          </div>
        )}

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>{enEdition ? "Modifier le collaborateur" : "Nouveau collaborateur"}</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <label>Identifiant de connexion *
              <input value={form.identifiant} onChange={maj("identifiant")}
                placeholder="ex. clerc4" disabled={!!enEdition} required /></label>
            <label>Nom et prénom (état civil)
              <input value={form.nom_complet} onChange={maj("nom_complet")} placeholder="ex. KOFFI Awa" /></label>
            <label>Nom affiché *
              <input value={form.nom_affiche} onChange={maj("nom_affiche")} placeholder="ex. Mme Koffi Awa" required /></label>
            <label>Fonction
              <select value={form.fonction} onChange={maj("fonction")}>
                {FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select></label>
            <label>Niveau d'accès
              <select value={form.niveau_acces} onChange={maj("niveau_acces")}>
                {NIVEAUX.map((n) => <option key={n.v} value={n.v}>{n.t}</option>)}
              </select></label>
            {!enEdition && (
              <label>Mot de passe provisoire * (8 caractères min.)
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <ChampMdp valeur={form.motDePasseProvisoire} onChange={maj("motDePasseProvisoire")} requis />
                  </div>
                  <button type="button" className="bouton secondaire"
                    style={{ whiteSpace: "nowrap", padding: "6px 10px", fontSize: 12 }}
                    onClick={generer}>🎲 Générer</button>
                </div>
              </label>
            )}
          </div>
          <p className="sous-titre" style={{ marginTop: 8 }}>
            La <strong>fonction</strong> décrit le poste ; le <strong>niveau d'accès</strong> décide de ce que la personne voit.
            Choisir « Notaire » ou « Comptable » propose le niveau adapté — vous restez libre de le changer.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {enEdition ? (<>
              <button className="bouton" onClick={enregistrerModif}>Enregistrer les modifications</button>
              <button className="bouton secondaire" onClick={() => { setEnEdition(null); setForm(VIDE); }}>Annuler</button>
            </>) : (
              <button className="bouton" onClick={creer}>Créer le compte</button>
            )}
          </div>
        </div>

        <table>
          <thead><tr>
            <th>Identifiant</th><th>Nom et prénom</th><th>Nom affiché</th>
            <th>Fonction</th><th>Niveau d'accès</th><th>État</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {lignes.map((u) => {
              const admin = u.niveau_acces === "administrateur";
              return (
                <tr key={u.id} style={{ background: !u.actif ? "#F0EAF8" : u.verrouille ? "#FFF4C2" : undefined }}>
                  <td>{u.identifiant}</td>
                  <td>{u.nom_complet || "—"}</td>
                  <td>{u.nom_affiche}</td>
                  <td>{u.fonction || "—"}</td>
                  <td>{libelleNiveau(u.niveau_acces)}</td>
                  <td>{!u.actif ? "Désactivé" : u.verrouille ? "🔒 Verrouillé" : u.doit_changer_mdp ? "Mdp provisoire" : "Actif"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11, marginRight: 4 }}
                      onClick={() => modifier(u)}>Modifier</button>
                    <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11, marginRight: 4 }}
                      onClick={() => action(u.id, "reinitialiser")}>Réinit. mdp</button>
                    {u.verrouille && (
                      <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11, marginRight: 4 }}
                        onClick={() => action(u.id, "deverrouiller")}>Déverrouiller</button>
                    )}
                    {!admin && (<>
                      <button className="bouton secondaire" style={{ padding: "3px 8px", fontSize: 11, marginRight: 4 }}
                        onClick={() => action(u.id, u.actif ? "desactiver" : "reactiver")}>
                        {u.actif ? "Désactiver" : "Réactiver"}</button>
                      <button className="bouton secondaire"
                        style={{ padding: "3px 8px", fontSize: 11, color: "#C00000", borderColor: "#E0B4B4" }}
                        onClick={() => supprimer(u)}>Supprimer</button>
                    </>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </>
  );
}
