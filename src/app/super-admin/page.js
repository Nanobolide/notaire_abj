"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

const FORFAITS = [
  { v: "ami",       t: "Ami",       d: "Bêta-testeurs · retours attendus", couleur: "#7A5AA0", fond: "#F2ECF7" },
  { v: "essentiel", t: "Essentiel", d: "Petite étude · fonctions de base", couleur: "#5A6478", fond: "#F1F3F7" },
  { v: "pro",       t: "Pro",       d: "Toutes les fonctions",            couleur: "#1F3864", fond: "#EAEEF6" },
  { v: "pro_max",   t: "Pro Max",   d: "Grandes études · support prioritaire", couleur: "#8A6D1F", fond: "#FBF6E9" },
];
const TYPES = [
  { v: "information", t: "Information" },
  { v: "mise_a_jour", t: "Mise à jour" },
  { v: "maintenance", t: "Maintenance" },
];
const badgeForfait = (f) => {
  const x = FORFAITS.find((y) => y.v === f) || FORFAITS[1];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 11,
    background: x.fond, color: x.couleur, whiteSpace: "nowrap" }}>{x.t}</span>;
};

export default function SuperAdmin() {
  const [autorise, setAutorise] = useState(null);
  const [onglet, setOnglet] = useState("etudes");
  const [etudes, setEtudes] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [reglages, setReglages] = useState(null);
  const [annonce, setAnnonce] = useState({ titre: "", message: "", type: "information", cible: "toutes", forfait_cible: "pro", etudes: [] });

  useEffect(() => {
    fetch("/api/session").then(lireJson).then((d) => {
      setAutorise(d.role === "super_admin");
    });
  }, []);
  const chargerEtudes = () => fetch("/api/super-admin/etudes").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setEtudes(d)));
  const chargerAnnonces = () => fetch("/api/super-admin/annonces").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setAnnonces(d)));
  const chargerReglages = () => fetch("/api/super-admin/reglages").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setReglages(d)));
  useEffect(() => { if (autorise) { chargerEtudes(); chargerAnnonces(); chargerReglages(); } }, [autorise]);

  const majReglage = async (cle, valeur) => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/super-admin/reglages", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cle, valeur }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Réglage enregistré."); chargerReglages();
  };

  const changerForfait = async (etudeId, forfait) => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/super-admin/etudes", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etudeId, forfait }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Forfait mis à jour."); chargerEtudes();
  };
  const basculerStatut = async (e) => {
    setErreur(""); setInfo("");
    const statut = e.statut === "active" ? "desactivee" : "active";
    const rep = await fetch("/api/super-admin/etudes", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etudeId: e.id, statut }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    chargerEtudes();
  };

  const envoyer = async () => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/super-admin/annonces", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(annonce) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setInfo("Annonce diffusée."); setAnnonce({ titre: "", message: "", type: "information", cible: "toutes", forfait_cible: "pro", etudes: [] });
    chargerAnnonces();
  };
  const toggleEtude = (id) => setAnnonce((a) => ({ ...a,
    etudes: a.etudes.includes(id) ? a.etudes.filter((x) => x !== id) : [...a.etudes, id] }));

  if (autorise === null) return (<><Entete /><main className="page"><p className="sous-titre">Chargement…</p></main></>);
  if (autorise === false) return (<><Entete /><main className="page">
    <div className="carte" style={{ borderColor: "#E0B4B4", background: "#FDF3F3" }}>
      <h1 style={{ fontSize: 15, color: "#B03030" }}>Accès réservé</h1>
      <p className="sous-titre">Cet espace est réservé au Super Administrateur de la plateforme.</p>
    </div></main></>);

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Administration de la plateforme</h1>
        <p className="sous-titre">Gestion des études, de leurs abonnements, et des annonces. Espace réservé à l'éditeur.</p>
        {erreur && <div className="erreur">{erreur}</div>}
        {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button className={onglet === "etudes" ? "bouton" : "bouton secondaire"} onClick={() => setOnglet("etudes")}>Études & forfaits</button>
          <button className={onglet === "annonces" ? "bouton" : "bouton secondaire"} onClick={() => setOnglet("annonces")}>Annonces</button>
          <button className={onglet === "reglages" ? "bouton" : "bouton secondaire"} onClick={() => setOnglet("reglages")}>Réglages</button>
        </div>

        {onglet === "etudes" && (
          <>
            <table className="table-comptes">
              <thead><tr><th>Étude</th><th>Comptes</th><th>Forfait</th><th>Statut</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {etudes.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.nom}</td>
                    <td>{e.comptes}</td>
                    <td>
                      <select value={e.forfait} onChange={(ev) => changerForfait(e.id, ev.target.value)} style={{ fontSize: 12 }}>
                        {FORFAITS.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 11.5 }}>{e.statut === "active"
                      ? <span style={{ color: "#2E7D32" }}>● Active</span>
                      : <span style={{ color: "#7A5AA0" }}>⏸ Désactivée</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="icone" title={e.statut === "active" ? "Désactiver l'étude" : "Réactiver"}
                              onClick={() => basculerStatut(e)}>{e.statut === "active" ? "⏸️" : "▶️"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11, color: "#7A8396" }}>
              {FORFAITS.map((f) => <span key={f.v}>{badgeForfait(f.v)} <span style={{ marginLeft: 5 }}>{f.d}</span></span>)}
            </div>
          </>
        )}

        {onglet === "annonces" && (
          <>
            <div className="carte">
              <h1 style={{ fontSize: 15 }}>Nouvelle annonce</h1>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                <label>Titre
                  <input value={annonce.titre} onChange={(e) => setAnnonce({ ...annonce, titre: e.target.value })} placeholder="ex. Mise à jour du module comptable" /></label>
                <label>Type
                  <select value={annonce.type} onChange={(e) => setAnnonce({ ...annonce, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                  </select></label>
              </div>
              <label style={{ display: "block", marginTop: 12 }}>Message
                <textarea value={annonce.message} onChange={(e) => setAnnonce({ ...annonce, message: e.target.value })}
                          rows={3} style={{ width: "100%", resize: "vertical" }} placeholder="Votre message aux études…" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
                <label>Destinataires
                  <select value={annonce.cible} onChange={(e) => setAnnonce({ ...annonce, cible: e.target.value })}>
                    <option value="toutes">Toutes les études</option>
                    <option value="forfait">Par forfait</option>
                    <option value="selection">Une sélection</option>
                  </select></label>
                {annonce.cible === "forfait" && (
                  <label>Forfait ciblé
                    <select value={annonce.forfait_cible} onChange={(e) => setAnnonce({ ...annonce, forfait_cible: e.target.value })}>
                      {FORFAITS.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}
                    </select></label>
                )}
              </div>
              {annonce.cible === "selection" && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: "#5A6478", marginBottom: 6 }}>Cochez les études :</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {etudes.map((e) => (
                      <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                        border: "1px solid #D9DEE8", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
                        <input type="checkbox" checked={annonce.etudes.includes(e.id)} onChange={() => toggleEtude(e.id)} />
                        {e.nom}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ marginTop: 14 }}><button className="bouton" onClick={envoyer}>Diffuser l'annonce</button></p>
            </div>

            <h2 style={{ fontSize: 14, color: "#1F3864", marginTop: 18 }}>Annonces diffusées</h2>
            <table className="table-comptes">
              <thead><tr><th>Date</th><th>Titre</th><th>Type</th><th>Cible</th><th>Lectures</th></tr></thead>
              <tbody>
                {annonces.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 11.5 }}>{new Date(a.cree_le).toLocaleDateString("fr-FR")}</td>
                    <td style={{ fontWeight: 500 }}>{a.titre}</td>
                    <td style={{ fontSize: 11.5 }}>{TYPES.find((t) => t.v === a.type)?.t}</td>
                    <td style={{ fontSize: 11.5 }}>{a.cible === "toutes" ? "Toutes" : a.cible === "forfait" ? `Forfait ${a.forfait_cible}` : "Sélection"}</td>
                    <td>{a.lectures}</td>
                  </tr>
                ))}
                {annonces.length === 0 && <tr><td colSpan={5} className="sous-titre">Aucune annonce pour l'instant.</td></tr>}
              </tbody>
            </table>
          </>
        )}

        {onglet === "reglages" && reglages && (
          <div className="carte">
            <h1 style={{ fontSize: 15 }}>Réglages de la plateforme</h1>
            <p className="sous-titre">Ces interrupteurs pilotent des fonctions pour toutes les études.
              Ils sont volontairement prudents : rien n'est activé tant que vous ne le décidez pas.</p>

            <div style={{ borderTop: "1px solid #E3E7EF", padding: "12px 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 13.5 }}>
                <input type="checkbox" checked={reglages.offres_actives === "true"}
                       onChange={(e) => majReglage("offres_actives", e.target.checked ? "true" : "false")} />
                Activer le service d'offres (Proposition de vente / d'achat)
              </label>
              <p style={{ fontSize: 12, color: "#7A8396", margin: "4px 0 0 26px" }}>
                Réservé aux forfaits Pro et Pro Max. Éteint, aucune étude ne voit l'onglet Offres.
              </p>
            </div>

            <div style={{ borderTop: "1px solid #E3E7EF", padding: "12px 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 13.5 }}>
                <input type="checkbox" checked={reglages.forfaits_restrictions_actives === "true"}
                       onChange={(e) => majReglage("forfaits_restrictions_actives", e.target.checked ? "true" : "false")} />
                Appliquer les restrictions de forfait
              </label>
              <p style={{ fontSize: 12, color: "#7A8396", margin: "4px 0 0 26px" }}>
                Éteint (recommandé au départ), le forfait ne fait que classer les études, sans limiter aucune fonction.
              </p>
            </div>

            <div style={{ borderTop: "1px solid #E3E7EF", padding: "12px 0" }}>
              <p style={{ fontWeight: 600, fontSize: 13.5, margin: "0 0 6px" }}>Qui voit les annonces de la plateforme ?</p>
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="radio" name="visib" checked={reglages.annonces_visibles_par === "tous"}
                         onChange={() => majReglage("annonces_visibles_par", "tous")} />
                  Le notaire et tous les collaborateurs
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="radio" name="visib" checked={reglages.annonces_visibles_par === "notaire"}
                         onChange={() => majReglage("annonces_visibles_par", "notaire")} />
                  Le notaire seul
                </label>
              </div>
              <p style={{ fontSize: 12, color: "#7A8396", margin: "6px 0 0" }}>
                Vous pourrez demander leur préférence aux notaires au lancement, puis ajuster ici.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
