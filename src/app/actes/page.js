"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";
import { useBrouillon, effacerBrouillon } from "@/lib/brouillon";
import { couleurActe, joursEcoules, respectEcheance, resteAPayer, formatFcfa } from "@/lib/regles";

const VIDE = { numero_minute: "", numero_dossier: "", nature_acte: "", complexite: "Simple",
  responsable: "", conservation_fonciere: "", progression: "Rédaction",
  valeur_acte: "", honoraires_totaux: "", montant_regle: "", statut_paiement: "En attente",
  emoluments: "", droits_etat: "", debours: "", prestations_annexes: "",
  autres_depenses: "", autres_depenses_motif: "", debours_rembourses: false,
  parties: ["", ""], difficultes: "", observations: "" };

// Complexité pré-sélectionnée selon la nature (modifiable, sauf Succession : toujours Complexe)
const NATURES_COMPLEXES = ["Succession", "Société", "Vente", "Achat", "Ouverture de Crédit",
  "Mainlevée d'Hypothèque", "Dation en Paiement", "Adoption"];

export default function Page() {
  return <Suspense><Actes /></Suspense>;
}

function Actes() {
  const vueInitiale = useSearchParams().get("vue") === "registre" ? "registre" : "formulaire";
  const [vue, setVue] = useState(vueInitiale);
  const [lignes, setLignes] = useState([]);
  const [refs, setRefs] = useState({});
  const [form, setForm] = useState(VIDE);
  const [enEdition, setEnEdition] = useState(null); // id de l'acte en cours de modification
  const majFiltre = (o) => { setPage(1); setFiltres(o); };
  const [filtres, setFiltres] = useState({ progression: "", conservation: "", paiement: "", du: "", au: "" });
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [erreur, setErreur] = useState("");
  const [admin, setAdmin] = useState(false);
  const [voitArgent, setVoitArgent] = useState(false);
  const [peutFormalites, setPeutFormalites] = useState(false);
  const [peutPrevision, setPeutPrevision] = useState(false);
  const [param, setParam] = useState(null);
  const [voletDelais, setVoletDelais] = useState(false);
  const [typeDelai, setTypeDelai] = useState("acte_simple");
  const [journal, setJournal] = useState(null);

  const charger = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v));
    q.set("page", String(page));
    const rep = await fetch("/api/actes?" + q);
    const data = await lireJson(rep);
    if (rep.ok) { setLignes(data.lignes || []); setMeta({ total: data.total || 0, pages: data.pages || 1 }); }
    else setErreur(data.erreur);
  }, [filtres, page]);

  useEffect(() => { fetch("/api/referentiels").then((r) => r.json()).then(setRefs); }, []);
  useEffect(() => { fetch("/api/parametres").then((r) => r.json()).then((d) => !d.erreur && setParam(d)); }, []);
  useEffect(() => { fetch("/api/session").then((r) => r.json())
    .then((d) => {
      const n = d.niveauAcces || (d.role === "admin_etude" ? "administrateur" : "standard");
      setAdmin(n === "administrateur" || d.role === "super_admin");
      setVoitArgent(["administrateur", "notaire_salarie", "comptable"].includes(n) || d.role === "super_admin");
      setPeutFormalites(["administrateur", "notaire_salarie", "comptable"].includes(n) || d.fonction === "Formaliste");
      const REDACTEURS = ["Notaire principal","Notaire salarié","Clerc de 1ère catégorie","Clerc 2","Clerc 3","Clerc 4","Clerc 5"];
      setPeutPrevision(["administrateur","notaire_salarie","comptable"].includes(n) || REDACTEURS.includes(d.fonction));
    }); }, []);
  useEffect(() => { charger(); }, [charger]);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });
  const majNature = (e) => {
    const nature = e.target.value;
    const complexite = NATURES_COMPLEXES.includes(nature) ? "Complexe" : "Simple";
    setForm({ ...form, nature_acte: nature, complexite });
  };
  const majPartie = (i) => (e) => {
    const parties = [...form.parties]; parties[i] = e.target.value;
    setForm({ ...form, parties });
  };
  const ajouterPartie = () => setForm({ ...form, parties: [...form.parties, ""] });
  const retirerPartie = (i) => setForm({ ...form, parties: form.parties.filter((_, j) => j !== i) });

  const editer = (a) => {
    setEnEdition(a.id);
    setForm({
      numero_minute: a.numero_minute || "", numero_dossier: a.numero_dossier || "",
      nature_acte: a.nature_acte || "", complexite: a.complexite || "Simple",
      responsable: a.responsable || "", conservation_fonciere: a.conservation_fonciere || "",
      progression: a.progression || "Rédaction",
      valeur_acte: a.valeur_acte ?? "", honoraires_totaux: a.honoraires_totaux ?? "",
      montant_regle: a.montant_regle ?? "", statut_paiement: a.statut_paiement || "En attente",
      parties: a.parties ? a.parties.split(" / ") : ["", ""],
      difficultes: a.difficultes || "", observations: a.observations || "",
    });
    setVue("formulaire");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const annulerEdition = () => { setEnEdition(null); setForm(VIDE); };

  const enregistrer = async (e) => {
    e.preventDefault(); setErreur("");
    const corps = { ...form,
      valeur_acte: Number(form.valeur_acte) || 0,
      honoraires_totaux: Number(form.honoraires_totaux) || 0,
      montant_regle: Number(form.montant_regle) || 0 };
    const basePath = "/api/actes";
    const rep = await fetch(enEdition ? `${basePath}/${enEdition}` : basePath, {
      method: enEdition ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    });
    const data = await lireJson(rep);
    if (data.doublon) {
      if (confirm(data.message)) {
        const rep2 = await fetch(enEdition ? `${basePath}/${enEdition}` : basePath, {
          method: enEdition ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...corps, forcer: true }),
        });
        const d2 = await lireJson(rep2);
        if (!rep2.ok) { setErreur(d2.erreur); return; }
      } else return;
    } else if (!rep.ok) { setErreur(data.erreur); return; }
    effacerBrouillon("notaria_brouillon_acte"); setEnEdition(null); setForm(VIDE); charger(); setVue("registre");
  };

  const changerProgression = async (id, progression) => {
    await fetch(`/api/actes/${id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progression }) });
    charger();
  };

  /** Le Formaliste (ou le Notaire/Comptable) met à jour l'état des formalités depuis le tableau. */
  const changerFormalites = async (id, statut_formalites) => {
    const rep = await fetch(`/api/actes/${id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut_formalites }) });
    if (!rep.ok) { const d = await rep.json(); setErreur(d.erreur || "Modification refusée."); return; }
    charger();
  };

  const supprimer = async (a) => {
    if (!confirm(`Envoyer l'acte ${a.numero_minute} à la corbeille ?`)) return;
    const rep = await fetch(`/api/actes/${a.id}`, { method: "DELETE" });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  const ouvrirJournal = async (acte) => {
    const rep = await fetch(`/api/actes/${acte.id}/pieces`);
    setJournal({ acteId: acte.id, minute: acte.numero_minute, entrees: await lireJson(rep), texte: "" });
  };
  const ajouterEntree = async () => {
    if (!journal.texte.trim()) return;
    await fetch(`/api/actes/${journal.acteId}/pieces`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texte: journal.texte }) });
    const rep = await fetch(`/api/actes/${journal.acteId}/pieces`);
    setJournal({ ...journal, entrees: await lireJson(rep), texte: "" });
  };

  useBrouillon("notaria_brouillon_acte", form, setForm, !enEdition);

  const majSeuil = (rang) => (e) => setParam({ ...param, [`${typeDelai}_s${rang}`]: Number(e.target.value) });

  const appliquerDelais = async () => {
    const pref = typeDelai;
    const rep = await fetch("/api/parametres", { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [pref + "_s1"]: Number(param[pref + "_s1"]),
        [pref + "_s2"]: Number(param[pref + "_s2"]),
        [pref + "_s3"]: Number(param[pref + "_s3"]),
      }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setParam(d); setVoletDelais(false); charger(); // le tableau se recolore
  };
  const majParam = (ch) => (e) => setParam({ ...param, [ch]: e.target.value });

  const sel = (liste, valeur, onChange, vide = "—", desactive = false) => (
    <select value={valeur} onChange={onChange} disabled={desactive}>
      <option value="">{vide}</option>
      {(refs[liste] || []).map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Suivi des Actes et Minutes</h1>
        <p className="sous-titre">Échéance pré-remplie selon le barème du dossier — le délai se fige à Terminé ou Annulé.</p>

        <div className="onglets">
          <button className={vue === "formulaire" ? "actif" : ""} onClick={() => setVue("formulaire")}>
            {enEdition ? "✏️ Modification en cours" : "➕ Nouvel acte"}</button>
          <button className={vue === "registre" ? "actif" : ""} onClick={() => setVue("registre")}>📑 Registre ({lignes.length})</button>
        </div>

        {vue === "formulaire" && (
        <div className="carte" style={enEdition ? { borderLeft: "4px solid var(--or)", borderRadius: "0 8px 8px 0" } : undefined}>
          <h1 style={{ fontSize: 15 }}>{enEdition ? `Modifier l'acte ${form.numero_minute}` : "Nouvel acte"}</h1>
          <form className="saisie" onSubmit={enregistrer}>
            <label>N° minute *<input value={form.numero_minute} onChange={maj("numero_minute")} required placeholder="2026/0000" /></label>
            <label>N° dossier<input value={form.numero_dossier} onChange={maj("numero_dossier")} /></label>
            <label>Nature du dossier {sel("nature_acte", form.nature_acte, majNature)}</label>
            <label>Complexité {form.nature_acte === "Succession" && <span style={{ fontWeight: 400, color: "#5A6478" }}>(toujours complexe)</span>}
              <select value={form.complexite} onChange={maj("complexite")} disabled={form.nature_acte === "Succession"}>
                <option>Simple</option><option>Complexe</option>
              </select></label>
            <label>Responsable {sel("responsable", form.responsable, maj("responsable"))}</label>
            <label>Conservation Foncière {sel("conservation_fonciere", form.conservation_fonciere, maj("conservation_fonciere"))}</label>
            <label>Étape / Statut {sel("progression", form.progression, maj("progression"))}</label>
            {form.parties.map((p, i) => (
              <label key={i}>Partie {i + 1}
                <span style={{ display: "flex", gap: 4 }}>
                  <input style={{ flex: 1 }} value={p} onChange={majPartie(i)} />
                  {form.parties.length > 1 &&
                    <button type="button" className="bouton secondaire" style={{ padding: "2px 8px" }}
                      onClick={() => retirerPartie(i)} title="Retirer cette partie">✕</button>}
                </span></label>
            ))}
            <div style={{ alignSelf: "end" }}>
              <button type="button" className="bouton secondaire" onClick={ajouterPartie}>+ Ajouter une partie</button>
            </div>
            {peutPrevision && (<>
            <label>Valeur de l'acte (FCFA)<input type="number" min="0" value={form.valeur_acte} onChange={maj("valeur_acte")} /></label>
            <label>Frais annoncés au client (FCFA)<input type="number" min="0" value={form.honoraires_totaux} onChange={maj("honoraires_totaux")} /></label>
            <label>Montant versé par le client (FCFA)<input type="number" min="0" value={form.montant_regle} onChange={maj("montant_regle")} /></label>
            <label>Statut paiement {sel("statut_paiement", form.statut_paiement, maj("statut_paiement"))}</label>
            </>)}

            {voitArgent && (
            <div style={{ gridColumn: "1 / -1", border: "0.5px solid #E4D3A0", background: "#FBF9F2",
                          borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8A6D1F", marginBottom: 3 }}>
                Ventilation comptable</div>
              <p style={{ fontSize: 11, color: "#7A6A45", marginBottom: 10, lineHeight: 1.45 }}>
                Réservée au Notaire et au Comptable. Total facturé au client ={" "}
                <strong>émoluments + droits d'État + débours + autres dépenses</strong>.
                Seuls les <strong>émoluments</strong> sont un revenu de l'étude.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10 }}>
                <label>Émoluments (FCFA)
                  <input type="number" min="0" value={form.emoluments} onChange={maj("emoluments")} /></label>
                <label>Droits d'État (FCFA)
                  <input type="number" min="0" value={form.droits_etat} onChange={maj("droits_etat")} /></label>
                <label>Débours (FCFA)
                  <input type="number" min="0" value={form.debours} onChange={maj("debours")} /></label>
                <label>Prestations annexes (FCFA)
                  <input type="number" min="0" value={form.prestations_annexes} onChange={maj("prestations_annexes")} /></label>
                <label>Autres dépenses (FCFA)
                  <input type="number" min="0" value={form.autres_depenses} onChange={maj("autres_depenses")} /></label>
                <label>Motif des autres dépenses
                  <input value={form.autres_depenses_motif} onChange={maj("autres_depenses_motif")}
                         placeholder="ex. redressement" /></label>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 12 }}>
                <input type="checkbox" checked={!!form.debours_rembourses}
                       onChange={(e) => setForm({ ...form, debours_rembourses: e.target.checked })}
                       style={{ width: "auto" }} />
                Débours remboursés par le client
              </label>
              <p style={{ fontSize: 12, color: "#1F3864", marginTop: 10, fontWeight: 600 }}>
                Total facturé : {(Number(form.emoluments || 0) + Number(form.droits_etat || 0) +
                  Number(form.debours || 0) + Number(form.prestations_annexes || 0) +
                  Number(form.autres_depenses || 0)).toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            )}
            <label style={{ gridColumn: "1 / -1" }}>Difficultés rencontrées
              <textarea value={form.difficultes} onChange={maj("difficultes")} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Observations
              <textarea value={form.observations} onChange={maj("observations")} /></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="bouton">{enEdition ? "Enregistrer les modifications" : "Enregistrer l'acte"}</button>
              {enEdition && <button type="button" className="bouton secondaire" onClick={annulerEdition}>Annuler</button>}
            </div>
          </form>
          {erreur && <div className="erreur">{erreur}</div>}
        </div>
        )}

        {vue === "registre" && (<>
        {admin && (
          <div style={{ marginBottom: 8 }}>
            <button className="bouton secondaire" style={{ padding: "5px 12px", fontSize: 12, background: "#FBF6E9", borderColor: "#E4D3A0", color: "#8A6D1F", fontWeight: 600 }}
              onClick={() => setVoletDelais(!voletDelais)}>⚙ Régler les délais ▾</button>
            {voletDelais && param && (
              <div style={{ background: "#FBF9F2", border: "1px solid #E4D3A0", borderRadius: 8, padding: "12px 14px", marginTop: 8, maxWidth: 640 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "#8A6D1F", marginBottom: 9 }}>⚙ Réglage rapide des délais</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label style={{ fontSize: 11.5 }}>Type
                    <select value={typeDelai} onChange={(e) => setTypeDelai(e.target.value)}>
                      <option value="acte_simple">Actes simples</option>
                      <option value="acte_complexe">Actes complexes</option>
                      <option value="succession">Successions</option>
                      <option value="appel">Appels & courriers</option>
                    </select></label>
                  <label style={{ fontSize: 11.5 }}>Jaune après
                    <input type="number" min="1" value={param[`${typeDelai}_s1`]} onChange={majSeuil(1)} style={{ width: 62 }} /> j</label>
                  <label style={{ fontSize: 11.5 }}>Orange après
                    <input type="number" min="1" value={param[`${typeDelai}_s2`]} onChange={majSeuil(2)} style={{ width: 62 }} /> j</label>
                  <label style={{ fontSize: 11.5 }}>Rouge après
                    <input type="number" min="1" value={param[`${typeDelai}_s3`]} onChange={majSeuil(3)} style={{ width: 62 }} /> j</label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="bouton" onClick={appliquerDelais}>Appliquer — le tableau se recolore</button>
                  <a className="bouton secondaire" href="/parametres">Tous les paramètres →</a>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="baremes">
          <p className="bareme"><strong>Actes simples :</strong> <span className="p" style={{background:"#FFF4C2"}}/> &gt; 20 j <span className="p" style={{background:"#FFD9A0"}}/> &gt; 40 j <span className="p" style={{background:"#FF9E9E"}}/> &gt; 60 j
          &nbsp;·&nbsp; <strong>Complexes :</strong> &gt; 1 / 2 / 3 mois &nbsp;·&nbsp; <strong>Successions :</strong> &gt; 6 / 9 / 12 mois
          &nbsp;·&nbsp; <span className="p" style={{background:"#E9F7EC"}}/> Terminé <span className="p" style={{background:"#F0EAF8"}}/> Annulé</p>
        </div>
        {admin && (
          <button className="bouton" style={{ background: "#B8912F", marginBottom: 8 }}
            onClick={() => setVoletDelais(!voletDelais)}>⚙ Régler les délais {voletDelais ? "▲" : "▼"}</button>
        )}
        {admin && voletDelais && param && (
          <div className="volet-delais">
            <h3>⚙ Réglage rapide des délais</h3>
            <div className="ligne-delais">
              <label>Type
                <select value={typeDelai} onChange={(e) => setTypeDelai(e.target.value)}>
                  <option value="acte_simple">Actes simples</option>
                  <option value="acte_complexe">Actes complexes</option>
                  <option value="succession">Successions</option>
                </select></label>
              <label>Jaune après
                <input type="number" min="1" value={param[typeDelai + "_s1"]} onChange={majParam(typeDelai + "_s1")} /> j</label>
              <label>Orange après
                <input type="number" min="1" value={param[typeDelai + "_s2"]} onChange={majParam(typeDelai + "_s2")} /> j</label>
              <label>Rouge après
                <input type="number" min="1" value={param[typeDelai + "_s3"]} onChange={majParam(typeDelai + "_s3")} /> j</label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="bouton" onClick={appliquerDelais}>Appliquer — le tableau se recolore</button>
              <a className="bouton secondaire" href="/parametres">Tous les paramètres →</a>
            </div>
          </div>
        )}
        <div className="filtres">
          <span style={{ fontSize: 11, color: "#5A6478", alignSelf: "center" }}>Export du</span>
          <input type="date" value={filtres.du || ""} onChange={(e) => majFiltre({ ...filtres, du: e.target.value })} style={{ padding: "5px" }} />
          <span style={{ fontSize: 11, color: "#5A6478", alignSelf: "center" }}>au</span>
          <input type="date" value={filtres.au || ""} onChange={(e) => majFiltre({ ...filtres, au: e.target.value })} style={{ padding: "5px" }} />
          <a className="bouton secondaire" style={{ padding: "5px 10px", fontSize: 12 }}
             href={`/api/exports/actes?${new URLSearchParams(Object.fromEntries(Object.entries({du:filtres.du,au:filtres.au}).filter(([,v])=>v)))}`}>⬇ Excel</a>
          <a className="bouton secondaire" style={{ padding: "5px 10px", fontSize: 12 }} href="/imprimer/actes">🖨 Imprimer / PDF</a>
          <input type="search" placeholder="🔍 Rechercher (client, minute, dossier…)" value={recherche}
                 onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
          {sel("progression", filtres.progression, (e) => setFiltres({ ...filtres, progression: e.target.value }), "Toutes étapes")}
          {sel("conservation_fonciere", filtres.conservation, (e) => setFiltres({ ...filtres, conservation: e.target.value }), "Toutes conservations")}
          {sel("statut_paiement", filtres.paiement, (e) => setFiltres({ ...filtres, paiement: e.target.value }), "Tous paiements")}
        </div>
        {erreur && <div className="erreur">{erreur}</div>}
        <table className="registre">
          <thead>
            <tr>
              <th>N° minute</th><th>N° dossier</th><th>Ouverture</th><th>Échéance</th><th>Nature</th><th>Parties</th>
              <th>Responsable</th><th>Conservation</th><th>Étape / Statut</th><th>Formalités</th><th>Délai (j)</th>
              {voitArgent && (<><th>Honoraires</th><th>Reste à payer</th></>)}<th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign: "center", color: "#5A6478", padding: 20 }}>
                Registre vide — enregistrez votre premier acte, ou chargez la démonstration depuis le tableau de bord.</td></tr>
            )}
            {lignes.filter((a) => {
              if (!recherche.trim()) return true;
              const t = recherche.toLowerCase();
              return [a.numero_minute, a.numero_dossier, a.parties, a.nature_acte, a.conservation_fonciere]
                .some((v) => (v || "").toLowerCase().includes(t));
            }).map((a) => {
              const c = couleurActe(a, param);
              const fini = a.progression === "Terminé" || a.progression === "Annulé";
              return (
                <tr key={a.id} style={{ background: c.fond }}>
                  <td>{a.numero_minute}</td><td>{a.numero_dossier || "—"}</td>
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
                  <td>
                    {peutFormalites ? (
                      <select value={a.statut_formalites || "Pas encore débuté"}
                              onChange={(e) => changerFormalites(a.id, e.target.value)}
                              style={{ fontSize: 11.5, maxWidth: 155 }}>
                        {["Pas encore débuté", "Débuté", "En cours", "Terminé"].map((v) =>
                          <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (a.statut_formalites || "—")}
                  </td>
                  <td>{fini ? a.progression : joursEcoules(a.date_ouverture, a.termine_le)}</td>
                  {voitArgent && (<>
                  <td>{formatFcfa(a.honoraires_totaux)}</td>
                  <td style={{ fontWeight: 600 }}>{formatFcfa(resteAPayer(a))}</td>
                  </>)}
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="bouton secondaire" style={{ padding: "3px 8px", marginRight: 4 }}
                      onClick={() => editer(a)} title="Modifier toute la ligne">✏️</button>
                    <button className="bouton secondaire" style={{ padding: "3px 8px", marginRight: 4 }}
                      onClick={() => ouvrirJournal(a)} title="Journal des pièces">📎</button>
                    {admin && <button className="bouton secondaire" style={{ padding: "3px 8px" }}
                      onClick={() => supprimer(a)} title="Envoyer à la corbeille">🗑️</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {meta.pages > 1 && (
          <div className="pagination">
            <button className="bouton secondaire" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédent</button>
            <span>Page {page} / {meta.pages} — {meta.total} dossier(s)</span>
            <button className="bouton secondaire" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Suivant →</button>
          </div>
        )}
        </>)}

        {journal && (
          <div className="carte" style={{ marginTop: 16, borderLeft: "4px solid var(--or)", borderRadius: "0 8px 8px 0" }}>
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
