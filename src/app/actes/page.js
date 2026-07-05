"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";
import { couleurActe, joursEcoules, respectEcheance, resteAPayer, formatFcfa } from "@/lib/regles";

const VIDE = { numero_minute: "", numero_dossier: "", nature_acte: "", complexite: "Simple",
  responsable: "", conservation_fonciere: "", progression: "Rédaction",
  valeur_acte: "", honoraires_totaux: "", montant_regle: "", statut_paiement: "En attente",
  parties: ["", ""], observations: "" };

export default function Page() {
  return <Suspense><Actes /></Suspense>;
}

function Actes() {
  const vueInitiale = useSearchParams().get("vue") === "registre" ? "registre" : "formulaire";
  const [vue, setVue] = useState(vueInitiale);
  const [lignes, setLignes] = useState([]);
  const [refs, setRefs] = useState({});
  const [form, setForm] = useState(VIDE);
  const [filtres, setFiltres] = useState({ progression: "", conservation: "", paiement: "" });
  const [erreur, setErreur] = useState("");
  const [journal, setJournal] = useState(null); // { acteId, minute, entrees, texte }
  const [admin, setAdmin] = useState(false);
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v));
    const rep = await fetch("/api/actes?" + q);
    const data = await lireJson(rep);
    if (rep.ok) setLignes(data); else setErreur(data.erreur);
  }, [filtres]);

  useEffect(() => { fetch("/api/referentiels").then((r) => r.json()).then(setRefs); }, []);
  useEffect(() => { fetch("/api/session").then((r) => r.json())
    .then((d) => setAdmin(d.role === "admin_etude" || d.role === "super_admin")); }, []);
  useEffect(() => { charger(); }, [charger]);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });
  const majPartie = (i) => (e) => {
    const parties = [...form.parties]; parties[i] = e.target.value;
    setForm({ ...form, parties });
  };

  const enregistrer = async (e) => {
    e.preventDefault(); setErreur("");
    const rep = await fetch("/api/actes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form,
        valeur_acte: Number(form.valeur_acte) || 0,
        honoraires_totaux: Number(form.honoraires_totaux) || 0,
        montant_regle: Number(form.montant_regle) || 0 }),
    });
    const data = await lireJson(rep);
    if (!rep.ok) { setErreur(data.erreur); return; }
    setForm(VIDE); charger(); setVue("registre");
  };

  const changerProgression = async (id, progression) => {
    await fetch(`/api/actes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progression }),
    });
    charger();
  };

  const ouvrirJournal = async (acte) => {
    const rep = await fetch(`/api/actes/${acte.id}/pieces`);
    const entrees = await rep.json();
    setJournal({ acteId: acte.id, minute: acte.numero_minute, entrees, texte: "" });
  };

  const ajouterEntree = async () => {
    if (!journal.texte.trim()) return;
    await fetch(`/api/actes/${journal.acteId}/pieces`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte: journal.texte }),
    });
    const rep = await fetch(`/api/actes/${journal.acteId}/pieces`);
    setJournal({ ...journal, entrees: await rep.json(), texte: "" });
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
        <h1>Suivi des Actes et Minutes</h1>
        <p className="sous-titre">Échéance pré-remplie à J+14 — le délai se fige à Terminé ou Annulé. Le barème d'alerte s'adapte au type de dossier.</p>

        <div className="onglets">
          <button className={vue === "formulaire" ? "actif" : ""} onClick={() => setVue("formulaire")}>➕ Nouvel acte</button>
          <button className={vue === "registre" ? "actif" : ""} onClick={() => setVue("registre")}>📑 Registre ({lignes.length})</button>
        </div>

        {vue === "formulaire" && (
        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Nouvel acte</h1>
          <form className="saisie" onSubmit={enregistrer}>
            <label>N° minute *<input value={form.numero_minute} onChange={maj("numero_minute")} required placeholder="2026/0000" /></label>
            <label>N° dossier<input value={form.numero_dossier} onChange={maj("numero_dossier")} /></label>
            <label>Nature de l'acte {sel("nature_acte", form.nature_acte, maj("nature_acte"))}</label>
            <label>Complexité
              <select value={form.complexite} onChange={maj("complexite")}>
                <option>Simple</option><option>Complexe</option>
              </select></label>
            <label>Partie 1<input value={form.parties[0]} onChange={majPartie(0)} /></label>
            <label>Partie 2<input value={form.parties[1]} onChange={majPartie(1)} /></label>
            <label>Responsable {sel("destinataire", form.responsable, maj("responsable"))}</label>
            <label>Conservation Foncière {sel("conservation_fonciere", form.conservation_fonciere, maj("conservation_fonciere"))}</label>
            <label>Étape / Statut {sel("progression", form.progression, maj("progression"))}</label>
            {admin && (<>
            <label>Valeur de l'acte (FCFA)<input type="number" min="0" value={form.valeur_acte} onChange={maj("valeur_acte")} /></label>
            <label>Honoraires totaux (FCFA)<input type="number" min="0" value={form.honoraires_totaux} onChange={maj("honoraires_totaux")} /></label>
            <label>Montant réglé (FCFA)<input type="number" min="0" value={form.montant_regle} onChange={maj("montant_regle")} /></label>
            <label>Statut paiement {sel("statut_paiement", form.statut_paiement, maj("statut_paiement"))}</label>
            </>)}
            <label style={{ gridColumn: "1 / -1" }}>Observations
              <textarea value={form.observations} onChange={maj("observations")} /></label>
            <div><button className="bouton">Enregistrer l'acte</button></div>
          </form>
          {erreur && <div className="erreur">{erreur}</div>}
        </div>

        )}

        {vue === "registre" && (<>
        <div className="baremes">
          <p className="bareme"><strong>Actes simples :</strong> <span className="p" style={{background:"#FFF4C2"}}/> &gt; 20 j <span className="p" style={{background:"#FFD9A0"}}/> &gt; 40 j <span className="p" style={{background:"#FF9E9E"}}/> &gt; 60 j</p>
          <p className="bareme"><strong>Actes complexes :</strong> <span className="p" style={{background:"#FFF4C2"}}/> &gt; 1 mois <span className="p" style={{background:"#FFD9A0"}}/> &gt; 2 mois <span className="p" style={{background:"#FF9E9E"}}/> &gt; 3 mois</p>
          <p className="bareme"><strong>Successions :</strong> <span className="p" style={{background:"#FFF4C2"}}/> &gt; 6 mois <span className="p" style={{background:"#FFD9A0"}}/> &gt; 9 mois <span className="p" style={{background:"#FF9E9E"}}/> &gt; 12 mois <span style={{marginLeft:8}}/><span className="p" style={{background:"#E9F7EC"}}/> Terminé <span className="p" style={{background:"#F0EAF8"}}/> Annulé</p>
        </div>
        <div className="filtres">
          <input type="search" placeholder="🔍 Rechercher (client, minute, dossier…)" value={recherche}
                 onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
          {sel("progression", filtres.progression, (e) => setFiltres({ ...filtres, progression: e.target.value }), "Toutes progressions")}
          {sel("conservation_fonciere", filtres.conservation, (e) => setFiltres({ ...filtres, conservation: e.target.value }), "Toutes conservations")}
          {sel("statut_paiement", filtres.paiement, (e) => setFiltres({ ...filtres, paiement: e.target.value }), "Tous paiements")}
        </div>

        

        <table className="registre">
          <thead>
            <tr>
              <th>N° minute</th><th>Ouverture</th><th>Échéance</th><th>Nature</th><th>Parties</th>
              <th>Responsable</th><th>Conservation</th><th>Étape / Statut</th><th>Délai (j)</th>
              <th>Échéance ?</th><th>Honoraires</th><th>Reste à payer</th><th>Paiement</th><th>Pièces</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr><td colSpan={14} style={{ textAlign: "center", color: "#5A6478", padding: 20 }}>
                Registre vide — enregistrez votre premier acte ci-dessus.</td></tr>
            )}
            {lignes.filter((a) => {
              if (!recherche.trim()) return true;
              const t = recherche.toLowerCase();
              return [a.numero_minute, a.numero_dossier, a.parties, a.nature_acte, a.conservation_fonciere]
                .some((v) => (v || "").toLowerCase().includes(t));
            }).map((a) => {
              const c = couleurActe(a);
              const fini = a.progression === "Terminé" || a.progression === "Annulé";
              return (
                <tr key={a.id} style={{ background: c.fond }}>
                  <td>{a.numero_minute}</td>
                  <td>{new Date(a.date_ouverture).toLocaleDateString("fr-FR")}</td>
                  <td>{new Date(a.date_echeance).toLocaleDateString("fr-FR")}</td>
                  <td>{a.nature_acte || "—"}</td>
                  <td>{a.parties || "—"}</td>
                  <td>{a.responsable || "—"}</td>
                  <td>{a.conservation_fonciere || "—"}</td>
                  <td>
                    <select value={a.progression} onChange={(e) => changerProgression(a.id, e.target.value)}>
                      {(refs.progression || []).map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                  <td>{fini ? a.progression : joursEcoules(a.date_ouverture, a.termine_le)}</td>
                  <td>{respectEcheance(a)}</td>
                  {admin && (<>
                  <td>{formatFcfa(a.honoraires_totaux)}</td>
                  <td style={{ fontWeight: 600 }}>{formatFcfa(resteAPayer(a))}</td>
                  <td>{a.statut_paiement}</td>
                  </>)}
                  <td><button className="bouton secondaire" style={{ padding: "3px 8px" }}
                        onClick={() => ouvrirJournal(a)}>Journal</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </>)}

        {journal && (
          <div className="carte" style={{ marginTop: 16, borderLeft: "4px solid var(--or)" }}>
            <h1 style={{ fontSize: 15 }}>Journal des pièces manquantes — minute {journal.minute}</h1>
            <p className="sous-titre">Historique inaltérable : chaque entrée est horodatée et signée. Rien ne s'efface.</p>
            {journal.entrees.length === 0 && <p className="sous-titre">Aucune entrée pour l'instant.</p>}
            <ul>
              {journal.entrees.map((e, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <strong>{new Date(e.horodatage).toLocaleString("fr-FR")}</strong>
                  {" — "}{e.auteur || "?"} : {e.texte}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ flex: 1, padding: 7, border: "1px solid var(--trait)", borderRadius: 5 }}
                     placeholder="Ex. : titre foncier reçu, reste plan de bornage"
                     value={journal.texte}
                     onChange={(e) => setJournal({ ...journal, texte: e.target.value })} />
              <button className="bouton" onClick={ajouterEntree}>Ajouter au journal</button>
              <button className="bouton secondaire" onClick={() => setJournal(null)}>Fermer</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
