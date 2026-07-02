"use client";
import { useEffect, useState, useCallback } from "react";
import Entete from "@/components/Entete";
import { couleurAppel, joursEcoules, alerteSla } from "@/lib/regles";

const VIDE = { type_flux: "Appel Téléphonique", client_nom: "", telephone: "", email: "",
  reference_dossier: "", destinataire: "", mis_en_relation: "", motif: "",
  statut_traitement: "Non commencé", nb_tentatives: 0, observations: "" };

export default function Appels() {
  const [lignes, setLignes] = useState([]);
  const [refs, setRefs] = useState({});
  const [form, setForm] = useState(VIDE);
  const [filtres, setFiltres] = useState({ statut: "", motif: "", destinataire: "" });
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v));
    const rep = await fetch("/api/appels?" + q);
    const data = await rep.json();
    if (rep.ok) setLignes(data); else setErreur(data.erreur);
  }, [filtres]);

  useEffect(() => { fetch("/api/referentiels").then((r) => r.json()).then(setRefs); }, []);
  useEffect(() => { charger(); }, [charger]);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });
  const estAppel = form.type_flux === "Appel Téléphonique";

  const enregistrer = async (e) => {
    e.preventDefault(); setErreur("");
    const rep = await fetch("/api/appels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form,
        mis_en_relation: form.mis_en_relation === "" ? null : form.mis_en_relation === "Oui",
        nb_tentatives: Number(form.nb_tentatives) || 0 }),
    });
    const data = await rep.json();
    if (!rep.ok) { setErreur(data.erreur); return; }
    setForm(VIDE); charger();
  };

  const changerStatut = async (id, statut) => {
    await fetch(`/api/appels/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut_traitement: statut }),
    });
    charger();
  };

  const sel = (liste, valeur, onChange, vide = "—") => (
    <select value={valeur} onChange={onChange}>
      <option value="">{vide}</option>
      {(refs[liste] || []).map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Journal des Appels et Courriers</h1>
        <p className="sous-titre">
          Alerte automatique 72 h — toute demande d'appel non résolue en 3 jours est signalée en rouge.
          Courriers : délai de 5 jours.
        </p>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Nouvelle entrée</h1>
          <form className="saisie" onSubmit={enregistrer}>
            <label>Type de flux
              <select value={form.type_flux} onChange={maj("type_flux")}>
                {(refs.type_flux || ["Appel Téléphonique"]).map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>Nom du client *
              <input value={form.client_nom} onChange={maj("client_nom")} required /></label>
            {estAppel ? (
              <label>Téléphone
                <input value={form.telephone} onChange={maj("telephone")} placeholder="07 00 00 00 00" /></label>
            ) : (
              <label>E-mail
                <input type="email" value={form.email} onChange={maj("email")} /></label>
            )}
            <label>Référence dossier
              <input value={form.reference_dossier} onChange={maj("reference_dossier")} placeholder="2026/0000" /></label>
            <label>Destinataire {sel("destinataire", form.destinataire, maj("destinataire"))}</label>
            <label>Mis en relation ?
              <select value={form.mis_en_relation} onChange={maj("mis_en_relation")}>
                <option value="">—</option><option>Oui</option><option>Non</option>
              </select></label>
            <label>Motif {sel("motif", form.motif, maj("motif"))}</label>
            <label>Statut {sel("statut_traitement", form.statut_traitement, maj("statut_traitement"))}</label>
            <label>Nb tentatives
              <input type="number" min="0" value={form.nb_tentatives} onChange={maj("nb_tentatives")} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Observations / suivi
              <textarea value={form.observations} onChange={maj("observations")} /></label>
            <div><button className="bouton">Enregistrer l'entrée</button></div>
          </form>
          {erreur && <div className="erreur">{erreur}</div>}
          <p className="sous-titre" style={{ marginTop: 8 }}>
            L'heure de renseignement est capturée automatiquement à l'enregistrement ;
            elle reste modifiable ensuite pour les régularisations (modification tracée).
          </p>
        </div>

        <div className="filtres">
          {sel("statut_traitement", filtres.statut, (e) => setFiltres({ ...filtres, statut: e.target.value }), "Tous statuts")}
          {sel("motif", filtres.motif, (e) => setFiltres({ ...filtres, motif: e.target.value }), "Tous motifs")}
          {sel("destinataire", filtres.destinataire, (e) => setFiltres({ ...filtres, destinataire: e.target.value }), "Tous destinataires")}
        </div>

        <div className="legende">
          Légende :
          <span className="pastille" style={{ background: "#D6F5D6" }} /> Résolu
          <span className="pastille" style={{ background: "#FFFFFF" }} /> 0-3 j
          <span className="pastille" style={{ background: "#C9F0F0" }} /> &gt;3 j
          <span className="pastille" style={{ background: "#FFF3B0" }} /> &gt;7 j
          <span className="pastille" style={{ background: "#FFD9B3" }} /> &gt;14 j
          <span className="pastille" style={{ background: "#F4A460" }} /> &gt;30 j
          <span className="pastille" style={{ background: "#FFC7CE" }} /> &gt;60 j / 🚨 72 h / ≥3 tentatives
        </div>

        <table className="registre">
          <thead>
            <tr>
              <th>N°</th><th>Date</th><th>Heure</th><th>Réf. dossier</th><th>Client</th>
              <th>Contact</th><th>Destinataire</th><th>Motif</th><th>Statut</th>
              <th>Tent.</th><th>Jours</th><th>🚨 72 h</th><th>Saisi par</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign: "center", color: "#5A6478", padding: 20 }}>
                Registre vide — enregistrez votre première entrée ci-dessus.</td></tr>
            )}
            {lignes.map((l) => {
              const c = couleurAppel(l);
              return (
                <tr key={l.id} style={{ background: c.fond }}>
                  <td>{l.annee}-{String(l.numero).padStart(4, "0")}</td>
                  <td>{new Date(l.date_entree).toLocaleDateString("fr-FR")}</td>
                  <td>{String(l.heure).slice(0, 5)}</td>
                  <td>{l.reference_dossier || "—"}</td>
                  <td>{l.client_nom}</td>
                  <td>{l.telephone || l.email || "—"}</td>
                  <td>{l.destinataire || "—"}</td>
                  <td>{l.motif || "—"}</td>
                  <td>
                    <select value={l.statut_traitement} onChange={(e) => changerStatut(l.id, e.target.value)}>
                      {(refs.statut_traitement || []).map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ fontWeight: l.nb_tentatives >= 3 ? 700 : 400 }}>{l.nb_tentatives}</td>
                  <td>{l.statut_traitement === "Résolu" ? "Résolu ✅" : joursEcoules(l.date_entree, l.resolu_le)}</td>
                  <td>{l.statut_traitement === "Résolu" ? "✅" : alerteSla(l) ? "🚨" : "🟢"}</td>
                  <td>{l.saisi_par_nom || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </>
  );
}
