"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Entete from "@/components/Entete";
import Erreur from "@/components/Erreur";
import Pagination from "@/components/Pagination";
import { trier, fleche } from "@/lib/tri";
import { lireJson } from "@/lib/http";
import { useBrouillon, effacerBrouillon } from "@/lib/brouillon";
import { couleurAppel, joursEcoules, niveauAppel } from "@/lib/regles";

const VIDE = { type_flux: "Appel Téléphonique", client_nom: "", telephone: "", email: "",
  reference_dossier: "", destinataire: "", mis_en_relation: "", motif: "",
  statut_traitement: "Non commencé", nb_tentatives: 0, observations: "" };

export default function Page() {
  return <Suspense><Appels /></Suspense>;
}

function Appels() {
  const vueInitiale = useSearchParams().get("vue") === "registre" ? "registre" : "formulaire";
  const [vue, setVue] = useState(vueInitiale);
  const [lignes, setLignes] = useState([]);
  const [refs, setRefs] = useState({});
  const [form, setForm] = useState(VIDE);
  const [enEdition, setEnEdition] = useState(null);
  const majFiltre = (o) => { setPage(1); setFiltres(o); };
  const [filtres, setFiltres] = useState({ statut: "", motif: "", destinataire: "", du: "", au: "" });
  const [tri, setTri] = useState({ champ: null, sens: "asc" });
  const clicTri = (champ) => setTri((t) =>
    t.champ === champ ? { champ, sens: t.sens === "asc" ? "desc" : "asc" } : { champ, sens: "asc" });
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [erreur, setErreur] = useState("");
  const [admin, setAdmin] = useState(false);
  const [param, setParam] = useState(null);

  const charger = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v));
    q.set("page", String(page));
    const rep = await fetch("/api/appels?" + q);
    const data = await lireJson(rep);
    if (rep.ok) { setLignes(data.lignes || []); setMeta({ total: data.total || 0, pages: data.pages || 1 }); }
    else setErreur(data.erreur);
  }, [filtres, page]);

  useEffect(() => { fetch("/api/referentiels").then((r) => r.json()).then(setRefs); }, []);
  useEffect(() => { fetch("/api/parametres").then((r) => r.json()).then((d) => !d.erreur && setParam(d)); }, []);
  useEffect(() => { fetch("/api/session").then((r) => r.json())
    .then((d) => setAdmin(d.role === "admin_etude" || d.role === "super_admin")); }, []);
  useEffect(() => { charger(); }, [charger]);

  const maj = (ch) => (e) => setForm({ ...form, [ch]: e.target.value });
  const estAppel = form.type_flux === "Appel Téléphonique";

  const editer = (l) => {
    setEnEdition(l.id);
    setForm({
      type_flux: l.type_flux, client_nom: l.client_nom || "",
      telephone: l.telephone || "", email: l.email || "",
      reference_dossier: l.reference_dossier || "", destinataire: l.destinataire || "",
      mis_en_relation: l.mis_en_relation === null ? "" : l.mis_en_relation ? "Oui" : "Non",
      motif: l.motif || "", statut_traitement: l.statut_traitement,
      nb_tentatives: l.nb_tentatives, observations: l.observations || "",
    });
    setVue("formulaire");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const annulerEdition = () => { setEnEdition(null); setForm(VIDE); };

  const enregistrer = async (e) => {
    e.preventDefault(); setErreur("");
    const corps = { ...form,
      mis_en_relation: form.mis_en_relation === "" ? null : form.mis_en_relation === "Oui",
      nb_tentatives: Number(form.nb_tentatives) || 0 };
    const basePath = "/api/appels";
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
    effacerBrouillon("notaria_brouillon_appel"); setEnEdition(null); setForm(VIDE); charger(); setVue("registre");
  };

  const changerStatut = async (id, statut) => {
    await fetch(`/api/appels/${id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut_traitement: statut }) });
    charger();
  };

  const supprimer = async (l) => {
    if (!confirm(`Envoyer l'entrée de ${l.client_nom} à la corbeille ?`)) return;
    const rep = await fetch(`/api/appels/${l.id}`, { method: "DELETE" });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  useBrouillon("notaria_brouillon_appel", form, setForm, !enEdition);

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
        <p className="sous-titre">Délais unifiés : ⚠ à suivre après 3 jours, 🚨 urgent après 5 jours, critique après 10 jours.</p>

        <div className="onglets">
          <button className={vue === "formulaire" ? "actif" : ""} onClick={() => setVue("formulaire")}>
            {enEdition ? "✏️ Modification en cours" : "➕ Nouvelle entrée"}</button>
          <button className={vue === "registre" ? "actif" : ""} onClick={() => setVue("registre")}>📋 Registre ({lignes.length})</button>
        </div>

        {vue === "formulaire" && (
        <div className="carte" style={enEdition ? { borderLeft: "4px solid var(--or)", borderRadius: "0 8px 8px 0" } : undefined}>
          <h1 style={{ fontSize: 15 }}>{enEdition ? `Modifier l'entrée de ${form.client_nom}` : "Nouvelle entrée"}</h1>
          <form className="saisie" onSubmit={enregistrer}>
            <label>Type de flux
              <select value={form.type_flux} onChange={maj("type_flux")}>
                {(refs.type_flux || ["Appel Téléphonique"]).map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>Nom du client *
              <input value={form.client_nom} onChange={maj("client_nom")} required /></label>
            {estAppel ? (
              <label>Téléphone (national ou étranger)
                <input value={form.telephone} onChange={maj("telephone")} placeholder="07 00 00 00 00 ou +33 6 12 34 56 78" /></label>
            ) : (
              <label>E-mail
                <input type="email" value={form.email} onChange={maj("email")} /></label>
            )}
            <label>Référence dossier
              <input value={form.reference_dossier} onChange={maj("reference_dossier")} placeholder="2026/0000" /></label>
            <label>Responsable (reçu par) {sel("responsables_appels", form.destinataire, maj("destinataire"))}</label>
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
            <div style={{ display: "flex", gap: 8 }}>
              <button className="bouton">{enEdition ? "Enregistrer les modifications" : "Enregistrer l'entrée"}</button>
              {enEdition && <button type="button" className="bouton secondaire" onClick={annulerEdition}>Annuler</button>}
            </div>
          </form>
          <Erreur message={erreur} />
          <p className="sous-titre" style={{ marginTop: 8 }}>
            L'heure de renseignement est capturée automatiquement à l'enregistrement.
          </p>
        </div>
        )}

        {vue === "registre" && (<>
        <p className="bareme">Barème : <span className="p" style={{background:"#FFF4C2"}}/> &gt; 3 j <span className="p" style={{background:"#FFD9A0"}}/> &gt; 5 j <span className="p" style={{background:"#FF9E9E"}}/> &gt; 10 j <span className="p" style={{background:"#E9F7EC"}}/> Résolu</p>
        <div className="filtres">
          <span style={{ fontSize: 11, color: "#5A6478", alignSelf: "center" }}>Export du</span>
          <input type="date" value={filtres.du || ""} onChange={(e) => majFiltre({ ...filtres, du: e.target.value })} style={{ padding: "5px" }} />
          <span style={{ fontSize: 11, color: "#5A6478", alignSelf: "center" }}>au</span>
          <input type="date" value={filtres.au || ""} onChange={(e) => majFiltre({ ...filtres, au: e.target.value })} style={{ padding: "5px" }} />
          <a className="bouton secondaire" style={{ padding: "5px 10px", fontSize: 12 }}
             href={`/api/exports/appels?${new URLSearchParams(Object.fromEntries(Object.entries({du:filtres.du,au:filtres.au}).filter(([,v])=>v)))}`}>⬇ Excel</a>
          <a className="bouton secondaire" style={{ padding: "5px 10px", fontSize: 12 }} href="/imprimer/appels">🖨 Imprimer / PDF</a>
          <input type="search" placeholder="🔍 Rechercher (client, dossier, téléphone…)" value={recherche}
                 onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
          {sel("statut_traitement", filtres.statut, (e) => setFiltres({ ...filtres, statut: e.target.value }), "Tous statuts")}
          {sel("motif", filtres.motif, (e) => setFiltres({ ...filtres, motif: e.target.value }), "Tous motifs")}
          {sel("responsables_appels", filtres.destinataire, (e) => setFiltres({ ...filtres, destinataire: e.target.value }), "Tous responsables")}
        </div>
        <Erreur message={erreur} />
        <table className="registre">
          <thead>
            <tr>
              <th onClick={() => clicTri("numero")} style={{ cursor: "pointer", userSelect: "none" }}>N°{fleche("numero", tri.champ, tri.sens)}</th><th onClick={() => clicTri("type_flux")} style={{ cursor: "pointer", userSelect: "none" }}>Type{fleche("type_flux", tri.champ, tri.sens)}</th><th onClick={() => clicTri("date_entree")} style={{ cursor: "pointer", userSelect: "none" }}>Date{fleche("date_entree", tri.champ, tri.sens)}</th><th onClick={() => clicTri("heure")} style={{ cursor: "pointer", userSelect: "none" }}>Heure{fleche("heure", tri.champ, tri.sens)}</th><th>Réf. dossier</th><th onClick={() => clicTri("client_nom")} style={{ cursor: "pointer", userSelect: "none" }}>Client{fleche("client_nom", tri.champ, tri.sens)}</th>
              <th>Contact</th><th onClick={() => clicTri("destinataire")} style={{ cursor: "pointer", userSelect: "none" }}>Destinataire{fleche("destinataire", tri.champ, tri.sens)}</th><th onClick={() => clicTri("motif")} style={{ cursor: "pointer", userSelect: "none" }}>Motif{fleche("motif", tri.champ, tri.sens)}</th><th onClick={() => clicTri("statut_traitement")} style={{ cursor: "pointer", userSelect: "none" }}>Statut{fleche("statut_traitement", tri.champ, tri.sens)}</th>
              <th>Tent.</th><th>Jours</th><th>🚨 Alerte</th><th>Saisi par</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr><td colSpan={15} style={{ textAlign: "center", color: "#5A6478", padding: 20 }}>
                Registre vide — enregistrez votre première entrée, ou chargez la démonstration depuis le tableau de bord.</td></tr>
            )}
            {trier(lignes, tri.champ, tri.sens).filter((l) => {
              if (!recherche.trim()) return true;
              const t = recherche.toLowerCase();
              return [l.client_nom, l.reference_dossier, l.telephone, l.email]
                .some((v) => (v || "").toLowerCase().includes(t));
            }).map((l) => {
              const c = couleurAppel(l, param);
              return (
                <tr key={l.id} style={{ background: c.fond }}>
                  <td>{l.annee}-{String(l.numero).padStart(4, "0")}</td>
                  <td>{l.type_flux === "Appel Téléphonique" ? "📞" : l.type_flux === "Courrier Physique" ? "✉️" : "📧"}</td>
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
                  <td style={{ fontWeight: l.nb_tentatives >= 3 ? 700 : 400,
                               color: l.nb_tentatives >= 3 && l.statut_traitement !== "Résolu" ? "#C00000" : undefined }}>{l.nb_tentatives}</td>
                  <td>{l.statut_traitement === "Résolu" ? "Résolu ✅" : joursEcoules(l.date_entree, l.resolu_le)}</td>
                  <td>{{ resolu: "✅", urgent: "🚨", suivre: "⚠", ok: "🟢" }[niveauAppel(l)]}</td>
                  <td>{l.saisi_par_nom || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="bouton secondaire" style={{ padding: "3px 8px", marginRight: 4 }}
                      onClick={() => editer(l)} title="Modifier toute la ligne">✏️</button>
                    {admin && <button className="bouton secondaire" style={{ padding: "3px 8px" }}
                      onClick={() => supprimer(l)} title="Envoyer à la corbeille">🗑️</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} totalPages={meta.pages} total={meta.total} unite="entrée(s)" onChange={setPage} />
        </>)}
      </main>
    </>
  );
}
