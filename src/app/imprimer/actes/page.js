"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";
import { couleurActe, joursEcoules, respectEcheance, formatFcfa, resteAPayer } from "@/lib/regles";

export default function ImprimerActes() {
  const [lignes, setLignes] = useState([]);
  const [session, setSession] = useState({});
  useEffect(() => {
    fetch("/api/actes").then(lireJson).then((d) => Array.isArray(d) && setLignes(d));
    fetch("/api/session").then((r) => r.json()).then(setSession);
  }, []);
  const admin = session.role === "admin_etude" || session.role === "super_admin";
  return (
    <main className="impression">
      <div className="barre-imprimer">
        <button className="bouton" onClick={() => window.print()}>🖨 Imprimer / Enregistrer en PDF</button>
        <a href="/actes?vue=registre" style={{ marginLeft: 10 }}>← Retour</a>
      </div>
      <h1 style={{ fontSize: 16 }}>SUIVI DES ACTES ET MINUTES — {session.etudeNom || ""}</h1>
      <p style={{ fontSize: 11, color: "#555" }}>Édité le {new Date().toLocaleDateString("fr-FR")} par {session.nom || ""} — {lignes.length} dossier(s) — document de suivi interne.</p>
      <table className="registre" style={{ fontSize: 10 }}>
        <thead><tr>
          <th>N° minute</th><th>Ouverture</th><th>Échéance</th><th>Nature</th><th>Parties</th>
          <th>Resp.</th><th>Conservation</th><th>Étape / Statut</th><th>Délai</th><th>Éch. ?</th>
          {admin && (<><th>Honoraires</th><th>Reste</th></>)}
        </tr></thead>
        <tbody>
          {lignes.map((a) => {
            const fini = a.progression === "Terminé" || a.progression === "Annulé";
            return (
              <tr key={a.id} style={{ background: couleurActe(a).fond }}>
                <td>{a.numero_minute}</td>
                <td>{new Date(a.date_ouverture).toLocaleDateString("fr-FR")}</td>
                <td>{new Date(a.date_echeance).toLocaleDateString("fr-FR")}</td>
                <td>{a.nature_acte || "—"}</td><td>{a.parties || "—"}</td>
                <td>{a.responsable || "—"}</td><td>{a.conservation_fonciere || "—"}</td>
                <td>{a.progression}</td>
                <td>{fini ? a.progression : joursEcoules(a.date_ouverture, a.termine_le)}</td>
                <td>{respectEcheance(a)}</td>
                {admin && (<><td>{formatFcfa(a.honoraires_totaux)}</td><td>{formatFcfa(resteAPayer(a))}</td></>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
