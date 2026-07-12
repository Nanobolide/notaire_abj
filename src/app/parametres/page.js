"use client";
import { useEffect, useState, useRef } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

export default function Parametres() {
  const fichierRef = useRef(null);
  const [apercu, setApercu] = useState(null);
  const [importInfo, setImportInfo] = useState("");
  const [importErr, setImportErr] = useState("");
  const [fichierChoisi, setFichierChoisi] = useState(null);

  const analyserFichier = async (f) => {
    setImportErr(""); setImportInfo(""); setApercu(null);
    if (!f) return;
    setFichierChoisi(f);
    const fd = new FormData(); fd.append("fichier", f);
    const rep = await fetch("/api/import-actes?etape=apercu", { method: "POST", body: fd });
    const d = await rep.json();
    if (!rep.ok) { setImportErr(d.erreur || "Fichier illisible."); return; }
    setApercu(d);
  };
  const confirmerImport = async () => {
    if (!fichierChoisi) return;
    setImportErr(""); setImportInfo("");
    const fd = new FormData(); fd.append("fichier", fichierChoisi);
    const rep = await fetch("/api/import-actes?etape=confirmer", { method: "POST", body: fd });
    const d = await rep.json();
    if (!rep.ok) { setImportErr(d.erreur || "Import impossible."); return; }
    setApercu(null); setFichierChoisi(null);
    if (fichierRef.current) fichierRef.current.value = "";
    setImportInfo(`${d.importees} dossier(s) importé(s).` + (d.ignorees ? ` ${d.ignorees} déjà présent(s), ignoré(s).` : ""));
  };
  const [tva, setTva] = useState("18");
  const [p, setP] = useState(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");

  const charger = () => fetch("/api/parametres").then(lireJson)
    .then((d) => {
      if (d.erreur) { setErreur(d.erreur); return; }
      setP(d);
      if (d.taux_tva != null) setTva(String(Number(d.taux_tva) * 100));
    });
  useEffect(() => { charger(); }, []);

  const enregistrerTva = async () => {
    const t = Number(tva) / 100;
    if (!(t >= 0 && t <= 1)) { alert("Le taux doit être compris entre 0 et 100 %."); return; }
    const rep = await fetch("/api/parametres", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taux_tva: t }) });
    const d = await rep.json();
    alert(rep.ok ? "Taux de TVA enregistré." : (d.erreur || "Modification refusée."));
    if (rep.ok) charger();
  };

  const maj = (ch) => (e) => setP({ ...p, [ch]: Number(e.target.value) });
  const maj2 = (ch) => (e) => setP({ ...p, [ch]: e.target.value });

  const enregistrer = async () => {
    setErreur(""); setInfo("");
    const rep = await fetch("/api/parametres", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setP(d); setInfo("Paramètres enregistrés.");
  };

  const reinitialiser = async () => {
    if (!confirm("Rétablir tous les barèmes et durées aux valeurs par défaut recommandées ?")) return;
    setErreur(""); setInfo("");
    const rep = await fetch("/api/parametres", { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reinitialiser: true }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    setP(d); setInfo("Valeurs par défaut rétablies.");
  };

  if (!p) return (<><Entete /><main className="page"><p>{erreur || "Chargement…"}</p></main></>);

  const Bareme = ({ titre, prefixe, unite }) => (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontWeight: 600, fontSize: 13, margin: "6px 0 4px" }}>{titre}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12 }}>Jaune après
          <input type="number" min="1" value={p[prefixe + "_s1"]} onChange={maj(prefixe + "_s1")} /> {unite}</label>
        <label style={{ fontSize: 12 }}>Orange après
          <input type="number" min="1" value={p[prefixe + "_s2"]} onChange={maj(prefixe + "_s2")} /> {unite}</label>
        <label style={{ fontSize: 12 }}>Rouge après
          <input type="number" min="1" value={p[prefixe + "_s3"]} onChange={maj(prefixe + "_s3")} /> {unite}</label>
      </div>
    </div>
  );

  return (
    <>
      <Entete />
      <main className="page" style={{ maxWidth: 780 }}>
        <h1>Paramètres de l'étude</h1>
        <p className="sous-titre">Réglez les durées et les seuils d'alerte. En cas de doute, le bouton « Rétablir les valeurs par défaut » remet les barèmes recommandés.</p>
        {erreur && <div className="erreur">{erreur}</div>}
        {info && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600 }}>{info}</p>}

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Conservation & session</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label>Conserver les données pendant
              <select value={p.conservation_annees} onChange={maj("conservation_annees")}>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} an{n>1?"s":""}</option>)}
              </select>
            </label>
            <label>Déconnexion automatique après
              <select value={p.session_minutes} onChange={maj("session_minutes")}>
                {[15,30,60,120].map((n) => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Barèmes de délais — Actes</h1>
          <Bareme titre="Actes simples (procuration, légalisation, bail…)" prefixe="acte_simple" unite="jours" />
          <Bareme titre="Actes complexes (vente, société, crédit…)" prefixe="acte_complexe" unite="jours" />
          <Bareme titre="Successions (toujours complexes)" prefixe="succession" unite="jours" />
          <p className="sous-titre">Rappel : 30 jours ≈ 1 mois, 180 ≈ 6 mois, 365 = 1 an.</p>
        </div>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Barèmes de délais — Appels & Courriers</h1>
          <Bareme titre="Appels, courriers physiques et électroniques" prefixe="appel" unite="jours" />
        </div>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Couleurs des alertes</h1>
          <p className="sous-titre">Personnalisez les teintes si vous le souhaitez. Le bouton « Rétablir » remet les couleurs recommandées.</p>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <label>1<sup>er</sup> seuil (léger)
              <input type="color" value={p.couleur_n1} onChange={maj2("couleur_n1")} /></label>
            <label>2<sup>e</sup> seuil (moyen)
              <input type="color" value={p.couleur_n2} onChange={maj2("couleur_n2")} /></label>
            <label>3<sup>e</sup> seuil (grave)
              <input type="color" value={p.couleur_n3} onChange={maj2("couleur_n3")} /></label>
            <label>Terminé / Résolu
              <input type="color" value={p.couleur_ok} onChange={maj2("couleur_ok")} /></label>
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "#5A6478", marginRight: 8 }}>Aperçu :</span>
            <span style={{ background: p.couleur_n1, padding: "3px 12px", borderRadius: 4, marginRight: 6, fontSize: 12 }}>léger</span>
            <span style={{ background: p.couleur_n2, padding: "3px 12px", borderRadius: 4, marginRight: 6, fontSize: 12 }}>moyen</span>
            <span style={{ background: p.couleur_n3, padding: "3px 12px", borderRadius: 4, marginRight: 6, fontSize: 12 }}>grave</span>
            <span style={{ background: p.couleur_ok, padding: "3px 12px", borderRadius: 4, fontSize: 12 }}>terminé</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="bouton" onClick={enregistrer}>Enregistrer les paramètres</button>
          <button className="bouton secondaire" onClick={reinitialiser}>↺ Rétablir les valeurs par défaut</button>
          <a className="bouton secondaire" href="/comptes" style={{ marginLeft: "auto" }}>Gérer les collaborateurs →</a>
        </div>

        <div className="carte" style={{ marginTop: 12 }}>
          <h1 style={{ fontSize: 15 }}>Taux de TVA sur les émoluments</h1>
          <p className="sous-titre">Conservé pour usage futur (option A : non inclus dans le total facturé affiché).
            Modifiable par le Notaire, le Notaire salarié et le Comptable.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <label style={{ maxWidth: 160 }}>Taux (en %)
              <input type="number" min="0" max="100" step="0.5"
                     value={tva} onChange={(e) => setTva(e.target.value)} />
            </label>
            <button className="bouton" onClick={enregistrerTva}>Enregistrer le taux</button>
          </div>
        </div>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Importer des dossiers depuis Excel</h1>
          <p className="sous-titre">Pour reprendre les anciens dossiers d'une étude sans tout ressaisir.
            Téléchargez le modèle, remplissez-le, puis importez-le. Un aperçu vous est montré avant tout enregistrement.
            Les dossiers déjà présents ne sont jamais écrasés.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a className="bouton secondaire" href="/api/import-actes/modele">⬇ Télécharger le modèle Excel</a>
            <input ref={fichierRef} type="file" accept=".xlsx"
                   onChange={(e) => analyserFichier(e.target.files?.[0])} style={{ fontSize: 13 }} />
          </div>
          {importErr && <div className="erreur" style={{ marginTop: 10 }}>{importErr}</div>}
          {importInfo && <p className="sous-titre" style={{ color: "#2E7D32", fontWeight: 600, marginTop: 10 }}>{importInfo}</p>}
          {apercu && (
            <div style={{ marginTop: 12, background: "#F7F9FC", borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 13, margin: "0 0 8px" }}>
                <strong>{apercu.valides}</strong> dossier(s) prêt(s) à importer sur {apercu.total} ligne(s) lue(s).
              </p>
              {apercu.anomalies?.length > 0 && (
                <ul style={{ fontSize: 12, color: "#B03030", margin: "0 0 8px", paddingLeft: 18 }}>
                  {apercu.anomalies.slice(0, 6).map((a, i) => <li key={i}>{a}</li>)}
                  {apercu.anomalies.length > 6 && <li>… et {apercu.anomalies.length - 6} autre(s).</li>}
                </ul>
              )}
              {apercu.apercu?.length > 0 && (
                <table className="table-comptes" style={{ fontSize: 12 }}>
                  <thead><tr><th>N° minute</th><th>Client</th><th>Nature</th><th>Total frais</th><th>Versé</th></tr></thead>
                  <tbody>
                    {apercu.apercu.map((l, i) => (
                      <tr key={i}><td>{l.numero_minute}</td><td>{l.client}</td><td>{l.nature_acte || "—"}</td>
                        <td>{Number(l.honoraires_totaux).toLocaleString("fr-FR")}</td>
                        <td>{Number(l.montant_regle).toLocaleString("fr-FR")}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p style={{ marginTop: 10 }}>
                <button className="bouton" onClick={confirmerImport} disabled={apercu.valides === 0}>
                  Confirmer l'import de {apercu.valides} dossier(s)
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
