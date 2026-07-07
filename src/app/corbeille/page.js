"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

export default function Corbeille() {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState("");

  const charger = () => fetch("/api/corbeille").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setData(d)));
  useEffect(() => { charger(); }, []);

  const action = async (type, id, definitif) => {
    if (definitif && !confirm("Suppression DÉFINITIVE et irréversible. Confirmer ?")) return;
    setErreur("");
    const rep = await fetch("/api/corbeille", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, definitif }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  const Bloc = ({ titre, type, lignes }) => (
    <div className="carte">
      <h1 style={{ fontSize: 15 }}>{titre} ({lignes.length})</h1>
      {lignes.length === 0 ? <p className="sous-titre">Rien dans la corbeille.</p> : (
        <table className="registre">
          <thead><tr><th>Référence</th><th>Détail</th><th>Supprimé le</th><th>Jours restants</th><th>Actions</th></tr></thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} style={{ background: Number(l.jours_restants) <= 5 ? "#FFF4C2" : undefined }}>
                <td>{l.reference}</td>
                <td>{l.detail || "—"}</td>
                <td>{new Date(l.supprime_le).toLocaleDateString("fr-FR")}</td>
                <td style={{ fontWeight: Number(l.jours_restants) <= 5 ? 700 : 400 }}>{l.jours_restants} j</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="bouton secondaire" style={{ padding: "3px 8px", marginRight: 4 }}
                    onClick={() => action(type, l.id, false)}>↩ Restaurer</button>
                  <button className="bouton secondaire" style={{ padding: "3px 8px", color: "#C00000", borderColor: "#C00000" }}
                    onClick={() => action(type, l.id, true)}>Supprimer définitivement</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Corbeille</h1>
        <p className="sous-titre">Les éléments supprimés y restent 30 jours. Restaurez-les d'un clic — ou supprimez-les définitivement (irréversible).</p>
        {erreur && <div className="erreur">{erreur}</div>}
        {!data && !erreur && <p>Chargement…</p>}
        {data && (<>
          <Bloc titre="📑 Actes supprimés" type="acte" lignes={data.actes} />
          <Bloc titre="📋 Appels & courriers supprimés" type="appel" lignes={data.appels} />
        </>)}
      </main>
    </>
  );
}
