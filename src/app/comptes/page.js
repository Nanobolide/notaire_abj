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
  { v: "administrateur",  t: "Administrateur",  d: "Tous les droits, y compris supprimer un compte", couleur: "#1F3864", fond: "#EAEEF6" },
  { v: "notaire_salarie", t: "Notaire salarié", d: "Tout, sauf les comptes et les paramètres", couleur: "#2E7D32", fond: "#EDF3EE" },
  { v: "comptable",       t: "Comptable",       d: "Comme un rédacteur, plus le volet financier", couleur: "#8A6D1F", fond: "#FBF6E9" },
  { v: "standard",        t: "Standard",        d: "Les registres, aucun montant", couleur: "#5A6478", fond: "#F4F5F8" },
  { v: "renseignement",   t: "Renseignement",   d: "Appels & courriers uniquement — juste pour renseigner", couleur: "#7A5AA0", fond: "#F2ECF7" },
];

const NIVEAU_SUGGERE = {
  "Notaire principal": "administrateur",
  "Notaire salarié": "notaire_salarie",
  "Comptable": "comptable",
};

const VIDE = { identifiant: "", nom_complet: "", fonction: "Clerc de 1ère catégorie",
               niveau_acces: "standard", motDePasseProvisoire: "" };

/** Mot de passe provisoire lisible : 10 caractères, sans O/0/l/1 ambigus. */
function genererMotDePasse() {
  const lettres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const chiffres = "23456789";
  const tout = lettres + chiffres;
  let mdp = lettres[Math.floor(Math.random() * lettres.length)] +
            chiffres[Math.floor(Math.random() * chiffres.length)];
  for (let i = 0; i < 8; i++) mdp += tout[Math.floor(Math.random() * tout.length)];
  return mdp.split("").sort(() => Math.random() - 0.5).join("");
}

function ChampMdp({ valeur, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={visible ? "text" : "password"} value={valeur} onChange={onChange}
             required style={{ paddingRight: 34, width: "100%" }} />
      <button type="button" onClick={() => setVisible(!visible)} title={visible ? "Masquer" : "Afficher"}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                 background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 5px" }}>
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}

const Badge = ({ niveau }) => {
  const n = NIVEAUX.find((x) => x.v === niveau) || NIVEAUX[3];
  return <span style={{ fontSize: 10.5, fontWeight: 500, padding: "3px 9px", borderRadius: 10,
                        background: n.fond, color: n.couleur, whiteSpace: "nowrap" }}>{n.t}</span>;
};

const Etat = ({ u }) => {
  if (!u.actif) return <span style={{ color: "#7A5AA0" }}>⏸ Désactivé</span>;
  if (u.verrouille) return <span style={{ color: "#B03030" }}>🔒 Verrouillé</span>;
  if (u.doit_changer_mdp) return <span style={{ color: "#8A6D1F" }}>⏳ Mot de passe provisoire</span>;
  return <span style={{ color: "#2E7D32" }}>● Actif</span>;
};

export default function Comptes() {
  const [lignes, setLignes] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState(null);      // id de la ligne en cours de modification
  const [brouillon, setBrouillon] = useState({});    // valeurs de la ligne éditée
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [mdpAffiche, setMdpAffiche] = useState(null);

  const charger = () => fetch("/api/comptes").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => { charger(); }, []);

  const maj = (ch) => (e) => {
    const v = e.target.value;
    if (ch === "fonction" && NIVEAU_SUGGERE[v]) setForm({ ...form, fonction: v, niveau_acces: NIVEAU_SUGGERE[v] });
    else setForm({ ...form, [ch]: v });
  };

  const generer = () => {
    setForm({ ...form, motDePasseProvisoire: genererMotDePasse() });
    setInfo("Mot de passe généré. Il ne s'affichera qu'une seule fois après la création.");
  };

  const copier = async (txt) => {
    try { await navigator.clipboard.writeText(txt); setInfo("Copié dans le presse-papiers."); }
    catch { setInfo("Copie impossible — sélectionnez le texte à la main."); }
  };

  const creer = async () => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/comptes", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, nom_affiche: form.identifiant, nom_complet: form.nom_complet }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setMdpAffiche({ identifiant: form.identifiant, mdp: form.motDePasseProvisoire });
    setForm(VIDE); setOuvert(false); charger();
  };

  /** Modification EN LIGNE, comme dans le registre des actes. */
  const ouvrirEdition = (u) => {
    setEdition(u.id); setErreur(""); setInfo("");
    setBrouillon({ nom_affiche: u.identifiant, nom_complet: u.nom_complet || "",
                   fonction: u.fonction || "Clerc de 1ère catégorie", niveau_acces: u.niveau_acces || "standard" });
  };
  const majBrouillon = (ch) => (e) => {
    const v = e.target.value;
    if (ch === "fonction" && NIVEAU_SUGGERE[v]) setBrouillon({ ...brouillon, fonction: v, niveau_acces: NIVEAU_SUGGERE[v] });
    else setBrouillon({ ...brouillon, [ch]: v });
  };
  const enregistrer = async (id) => {
    setErreur("");
    const rep = await fetch(`/api/comptes/${id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "modifier", ...brouillon }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setEdition(null); setInfo("Compte modifié."); charger();
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
    if (!confirm(`Supprimer définitivement le compte « ${u.identifiant} » ?\n\nCette action est irréversible.`)) return;
    setErreur(""); setInfo("");
    const rep = await fetch(`/api/comptes/${u.id}`, { method: "DELETE" });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Compte supprimé."); charger();
  };

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Comptes de l'étude</h1>
        <p className="sous-titre">Le mot de passe provisoire s'affiche une seule fois : transmettez-le de vive voix.
          Le collaborateur le change à sa première connexion. Aucun mot de passe n'est stocké en clair.</p>

        {erreur && <div className="erreur">{erreur}</div>}
        {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

        {mdpAffiche && (
          <div className="carte" style={{ background: "#FBF9F2", borderColor: "#E4D3A0" }}>
            <h1 style={{ fontSize: 15, color: "#8A6D1F" }}>🔑 Mot de passe provisoire — à transmettre maintenant</h1>
            <p className="sous-titre">Pour <strong>{mdpAffiche.identifiant}</strong>. Il ne sera plus jamais affiché.
              Communiquez-le de vive voix, jamais par courriel.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ background: "#fff", border: "1px solid #E4D3A0", borderRadius: 6,
                             padding: "10px 16px", fontSize: 17, letterSpacing: 1.5 }}>{mdpAffiche.mdp}</code>
              <button className="bouton secondaire" onClick={() => copier(mdpAffiche.mdp)}>📋 Copier</button>
              <button className="bouton" onClick={() => setMdpAffiche(null)}>J'ai noté, fermer</button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <button className="bouton" onClick={() => { setOuvert(!ouvert); setForm(VIDE); setEdition(null); }}>
            {ouvert ? "− Annuler" : "+ Ajouter un collaborateur"}
          </button>
        </div>

        {ouvert && (
          <div className="carte">
            <h1 style={{ fontSize: 15, marginBottom: 10 }}>Nouveau collaborateur</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr 1.2fr 1.3fr", gap: 14 }}>
              <label>Identifiant (nom affiché) *
                <input value={form.identifiant} onChange={maj("identifiant")} placeholder="ex. Mme Koffi Awa" required /></label>
              <label>Nom et prénom (état civil)
                <input value={form.nom_complet} onChange={maj("nom_complet")} placeholder="ex. KOFFI Awa Léontine" /></label>
              <label>Fonction
                <select value={form.fonction} onChange={maj("fonction")}>
                  {FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select></label>
              <label>Niveau d'accès
                <select value={form.niveau_acces} onChange={maj("niveau_acces")}>
                  {NIVEAUX.map((n) => <option key={n.v} value={n.v}>{n.t}</option>)}
                </select>
                <span style={{ display: "block", fontSize: 10.5, color: "#7A8396", marginTop: 3 }}>
                  {NIVEAUX.find((n) => n.v === form.niveau_acces)?.d}
                </span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 14, maxWidth: 460 }}>
              <label style={{ flex: 1 }}>Mot de passe provisoire * — 8 caractères minimum
                <ChampMdp valeur={form.motDePasseProvisoire} onChange={maj("motDePasseProvisoire")} /></label>
              <button type="button" className="bouton secondaire" style={{ whiteSpace: "nowrap" }}
                      onClick={generer}>🎲 Générer</button>
            </div>
            <p style={{ marginTop: 14 }}>
              <button className="bouton" onClick={creer}>Créer le compte</button>
            </p>
          </div>
        )}

        <table>
          <thead><tr>
            <th style={{ width: "22%" }}>Identifiant (nom affiché)</th>
            <th style={{ width: "20%" }}>Nom et prénom</th>
            <th style={{ width: "18%" }}>Fonction</th>
            <th style={{ width: "13%" }}>Niveau d'accès</th>
            <th style={{ width: "15%" }}>État</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr></thead>
          <tbody>
            {lignes.map((u) => {
              const estAdmin = u.niveau_acces === "administrateur";
              const enCours = edition === u.id;
              return (
                <tr key={u.id} style={{ background: !u.actif ? "#F7F4FB" : enCours ? "#FBF9F2" : undefined }}>
                  {enCours ? (<>
                    <td><input value={brouillon.nom_affiche} onChange={majBrouillon("nom_affiche")} style={{ fontSize: 12 }} /></td>
                    <td><input value={brouillon.nom_complet} onChange={majBrouillon("nom_complet")} style={{ fontSize: 12 }} /></td>
                    <td><select value={brouillon.fonction} onChange={majBrouillon("fonction")} style={{ fontSize: 11.5 }}>
                          {FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select></td>
                    <td><select value={brouillon.niveau_acces} onChange={majBrouillon("niveau_acces")} style={{ fontSize: 11.5 }}>
                          {NIVEAUX.map((n) => <option key={n.v} value={n.v}>{n.t}</option>)}</select></td>
                    <td><Etat u={u} /></td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <button className="icone" title="Enregistrer" onClick={() => enregistrer(u.id)}>✅</button>
                      <button className="icone" title="Annuler" onClick={() => setEdition(null)}>✖️</button>
                    </td>
                  </>) : (<>
                    <td style={{ fontWeight: 500 }}>{u.identifiant}</td>
                    <td style={{ color: "#5A6478" }}>{u.nom_complet || "—"}</td>
                    <td>{u.fonction || "—"}</td>
                    <td><Badge niveau={u.niveau_acces} /></td>
                    <td style={{ fontSize: 11.5 }}><Etat u={u} /></td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <button className="icone" title="Modifier ce compte" onClick={() => ouvrirEdition(u)}>✏️</button>
                      <button className="icone" title="Réinitialiser le mot de passe"
                              onClick={() => action(u.id, "reinitialiser")}>🔑</button>
                      {Boolean(u.verrouille) && (
                        <button className="icone" title="Déverrouiller" onClick={() => action(u.id, "deverrouiller")}>🔓</button>
                      )}
                      {!estAdmin && (<>
                        <button className="icone" title={u.actif ? "Désactiver" : "Réactiver"}
                                onClick={() => action(u.id, u.actif ? "desactiver" : "reactiver")}>
                          {u.actif ? "⏸️" : "▶️"}</button>
                        <button className="icone danger" title="Supprimer définitivement"
                                onClick={() => supprimer(u)}>🗑️</button>
                      </>)}
                    </td>
                  </>)}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 16, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11, color: "#7A8396" }}>
          {NIVEAUX.map((n) => (
            <span key={n.v}><Badge niveau={n.v} /> <span style={{ marginLeft: 5 }}>{n.d}</span></span>
          ))}
        </div>
      </main>
    </>
  );
}
