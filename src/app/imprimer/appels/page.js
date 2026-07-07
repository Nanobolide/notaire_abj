"use client";
import { useEffect, useState } from "react";
import { lireJson } from "@/lib/http";
import { couleurAppel, joursEcoules } from "@/lib/regles";

export default function ImprimerAppels() {
  const [lignes, setLignes] = useState([]);
  const [session, setSession] = useState({});
  useEffect(() => {
    fetch("/api/appels").then(lireJson).then((d) => Array.isArray(d) && setLignes(d));
    fetch("/api/session").then((r) => r.json()).then(setSession);
  }, []);
  return (
    <main className="impression">
      <div className="barre-imprimer">
        <button className="bouton" onClick={() => window.print()}>🖨 Imprimer / Enregistrer en PDF</button>
        <a href="/appels?vue=registre" style={{ marginLeft: 10 }}>← Retour</a>
      </div>
      <h1 style={{ fontSize: 16 }}>JOURNAL DES APPELS ET COURRIERS — {session.etudeNom || ""}</h1>
      <p style={{ fontSize: 11, color: "#555" }}>Édité le {new Date().toLocaleDateString("fr-FR")} par {session.nom || ""} — {lignes.length} entrée(s) — document de suivi interne.</p>
      <table className="registre" style={{ fontSize: 10 }}>
        <thead><tr>
          <th>N°</th><th>Type</th><th>Date</th><th>Heure</th><th>Réf.</th><th>Client</th>
          <th>Contact</th><th>Destinataire</th><th>Motif</th><th>Statut</th><th>Tent.</th><th>Jours</th>
        </tr></thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} style={{ background: couleurAppel(l).fond }}>
              <td>{l.annee}-{String(l.numero).padStart(4, "0")}</td>
              <td>{l.type_flux}</td>
              <td>{new Date(l.date_entree).toLocaleDateString("fr-FR")}</td>
              <td>{String(l.heure).slice(0, 5)}</td>
              <td>{l.reference_dossier || "—"}</td><td>{l.client_nom}</td>
              <td>{l.telephone || l.email || "—"}</td><td>{l.destinataire || "—"}</td>
              <td>{l.motif || "—"}</td><td>{l.statut_traitement}</td>
              <td>{l.nb_tentatives}</td>
              <td>{l.statut_traitement === "Résolu" ? "Résolu" : joursEcoules(l.date_entree, l.resolu_le)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
