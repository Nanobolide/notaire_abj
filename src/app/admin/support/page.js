"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";

const STATUTS = ["ouvert", "en_cours", "resolu", "ferme"];
const PRIORITES = ["basse", "normale", "haute", "urgente"];

export default function AdminSupport() {
  const [lignes, setLignes] = useState([]);
  const [erreur, setErreur] = useState("");

  const charger = () => fetch("/api/saas/support").then(lireJson)
    .then((d) => (d.erreur ? setErreur(d.erreur) : setLignes(d)));
  useEffect(() => { charger(); }, []);

  const maj = async (t, champ, valeur) => {
    const rep = await fetch(`/api/saas/support/${t.id}`, { method: "PATCH",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [champ]: valeur }) });
    const d = await lireJson(rep);
    if (!rep.ok) { setErreur(d.erreur); return; }
    charger();
  };

  return (
    <>
      <h1>Support</h1>
      <p className="sous-titre">Tickets ouverts par les études, tous plans confondus.</p>
      {erreur && <div className="erreur">{erreur}</div>}

      <table className="registre">
        <thead><tr>
          <th>Étude</th><th>Sujet</th><th>Description</th><th>Priorité</th><th>Statut</th><th>Ouvert le</th>
        </tr></thead>
        <tbody>
          {lignes.map((t) => (
            <tr key={t.id}>
              <td>{t.nom_tenant || "—"}</td>
              <td>{t.sujet}</td>
              <td style={{ maxWidth: 320 }}>{t.description}</td>
              <td>
                <select value={t.priorite} onChange={(e) => maj(t, "priorite", e.target.value)} style={{ fontSize: 11, padding: "3px 6px" }}>
                  {PRIORITES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td>
                <select value={t.statut} onChange={(e) => maj(t, "statut", e.target.value)} style={{ fontSize: 11, padding: "3px 6px" }}>
                  {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>{t.cree_le ? new Date(t.cree_le).toLocaleDateString("fr-FR") : "—"}</td>
            </tr>
          ))}
          {!lignes.length && <tr><td colSpan={6} className="sous-titre">Aucun ticket pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
