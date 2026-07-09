"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { lireJson } from "@/lib/http";

const fcfa = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("fr-FR") + " F");

function Reste({ valeur, ventile = true }) {
  const v = Number(valeur || 0);
  if (!ventile && v <= 0) return <span className="badge-ventiler">À ventiler</span>;
  if (v === 0) return <span style={{ color: "#2E7D32" }}>Soldé</span>;
  if (v < 0) return <span style={{ color: "#1F3864", fontWeight: 600 }}
      title="Le client a versé plus que le total facturé">{fcfa(-v)} en trop-perçu</span>;
  return (
    <span style={{ color: "#B03030", fontWeight: 600, background: "#FDF3F3",
                   borderRadius: 4, padding: "1px 6px" }}>{fcfa(v)}</span>
  );
}

function Compteur({ valeur, libelle, ton = "" }) {
  const couleurs = { vert: "#2E7D32", or: "#8A6D1F", orange: "#C06010", rouge: "#B03030" };
  const c = couleurs[ton] || "#1F3864";
  return (
    <div style={{ background: "#fff", border: "0.5px solid #D9DEE8", borderLeft: `4px solid ${c}`,
                  borderRadius: "0 8px 8px 0", padding: "9px 13px", minWidth: 138 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: c }}>{fcfa(valeur)}</div>
      <div style={{ fontSize: 10.5, color: "#5A6478", marginTop: 2 }}>{libelle}</div>
    </div>
  );
}

const Bandeau = ({ children }) => (
  <div style={{ background: "#B8912F", color: "#fff", fontWeight: 500, letterSpacing: 1,
                padding: "6px 12px", borderRadius: 6, fontSize: 12, margin: "16px 0 10px",
                display: "inline-block" }}>{children}</div>
);

export default function Comptabilite() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => { fetch("/api/comptabilite").then(lireJson)
    .then((r) => (r.erreur ? setErreur(r.erreur) : setD(r))); }, []);

  if (erreur) return (<><Entete /><main className="page"><div className="erreur">{erreur}</div></main></>);
  if (!d) return (<><Entete /><main className="page"><p>Chargement…</p></main></>);

  const g = d.global;
  return (
    <>
      <Entete />
      <main className="page">
        <h1>Tableau de bord — Comptabilité</h1>
        <p className="sous-titre">Ventilation saisie par le Comptable. Les dossiers annulés sont exclus
          de tous les calculs.</p>

        <Bandeau>A · RENTABILITÉ RÉELLE DE L'ÉTUDE</Bandeau>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Compteur valeur={g.emoluments} libelle="Émoluments — revenu de l'étude" ton="vert" />
          <Compteur valeur={g.droits_etat} libelle="Droits d'État à reverser" ton="orange" />
          <Compteur valeur={g.debours_total} libelle="Débours" ton="orange" />
          <Compteur valeur={g.debours_non_rembourses} libelle="Débours non remboursés" ton="rouge" />
          <Compteur valeur={g.autres_depenses} libelle="Autres dépenses" ton="orange" />
          <Compteur valeur={g.total_facture} libelle="Total facturé aux clients" />
          <Compteur valeur={g.encaisse} libelle="Encaissé" ton="vert" />
          <Compteur valeur={g.reste_a_recouvrer} libelle="Reste à recouvrer" ton="rouge" />
        </div>
        {Number(g.dossiers_a_ventiler) > 0 && (
          <p style={{ fontSize: 11.5, color: "#6B7383", background: "#F1F3F7", borderRadius: 7,
                      padding: "8px 11px", marginBottom: 10 }}>
            📋 <strong>{g.dossiers_a_ventiler}</strong> dossier{Number(g.dossiers_a_ventiler) > 1 ? "s" : ""} en
            attente de ventilation. Ouvrez le registre, cliquez sur ✏️ et répartissez le total des frais
            entre Droits d'État, Débours et Émoluments.
          </p>
        )}
        <p style={{ fontSize: 11, color: "#8A6D1F", background: "#FBF6E9", border: "0.5px solid #E4D3A0",
                    borderRadius: 7, padding: "9px 11px" }}>
          💡 <strong>Le total des frais</strong> ({fcfa(g.total_facture)}) est ce que paie le client. Le comptable le
          <strong> ventile</strong> en Droits d'État, Débours et Émoluments. Seuls les <strong>émoluments</strong>{" "}
          ({fcfa(g.emoluments)}) sont un revenu de l'étude. Total ventilé à ce jour : {fcfa(g.total_ventile)}.
        </p>

        <Bandeau>B · RENTABILITÉ PAR CATÉGORIE D'ACTE</Bandeau>
        <table className="financier">
          <thead><tr>
            <th style={{ width: "22%" }}>Nature de l'acte</th><th className="num" style={{ width: "8%" }}>Dossiers</th>
            <th className="num">Émoluments</th><th className="num">Droits d'État</th>
            <th className="num">Débours</th><th className="num">Total des frais</th>
            <th className="num">Encaissé</th><th className="num" style={{ width: "14%" }}>Reste à payer</th>
          </tr></thead>
          <tbody>
            {d.parNature.map((r) => (
              <tr key={r.nature_acte}>
                <td style={{ fontWeight: 500 }}>{r.nature_acte}</td>
                <td className="num">{r.dossiers}</td>
                <td className="num" style={{ color: "#2E7D32", fontWeight: 600 }}>{fcfa(r.emoluments)}</td>
                <td className="num">{fcfa(r.droits_etat)}</td>
                <td className="num">{fcfa(r.depenses)}</td>
                <td className="num">{fcfa(r.total_facture)}</td>
                <td className="num">{fcfa(r.encaisse)}</td>
                <td className="num"><Reste valeur={r.reste} ventile={Number(r.emoluments) + Number(r.droits_etat) > 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <Bandeau>C · RENTABILITÉ PAR COLLABORATEUR</Bandeau>
        <table className="financier">
          <thead><tr>
            <th style={{ width: "24%" }}>Collaborateur</th><th className="num" style={{ width: "9%" }}>Dossiers</th>
            <th className="num" style={{ width: "9%" }}>En cours</th>
            <th className="num">Émoluments générés</th><th className="num">Débours</th>
            <th className="num">Encaissé</th><th className="num" style={{ width: "14%" }}>Reste à payer</th>
          </tr></thead>
          <tbody>
            {d.parCollaborateur.map((r) => (
              <tr key={r.responsable}>
                <td style={{ fontWeight: 500 }}>{r.responsable}</td>
                <td className="num">{r.dossiers}</td><td className="num">{r.en_cours}</td>
                <td className="num" style={{ color: "#2E7D32", fontWeight: 600 }}>{fcfa(r.emoluments)}</td>
                <td className="num">{fcfa(r.debours)}</td>
                <td className="num">{fcfa(r.encaisse)}</td>
                <td className="num"><Reste valeur={r.reste} ventile={Number(r.emoluments) > 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <Bandeau>D · BALANCE DES TIERS — SOLDE DE CHAQUE CLIENT</Bandeau>
        <p className="sous-titre">Ce que chaque client doit encore, sans ouvrir un seul dossier physique.
          Les 30 soldes les plus importants.</p>
        <table className="financier">
          <thead><tr><th style={{ width: "38%" }}>Client</th><th className="num" style={{ width: "10%" }}>Dossiers</th>
            <th className="num">Total des frais</th><th className="num">Encaissé</th>
            <th className="num" style={{ width: "18%" }}>Solde</th></tr></thead>
          <tbody>
            {d.balance.map((r, i) => (
              <tr key={i}>
                <td>{r.client}</td><td className="num">{r.dossiers}</td>
                <td className="num">{fcfa(r.facture)}</td><td className="num">{fcfa(r.encaisse)}</td>
                <td className="num"><Reste valeur={r.solde} ventile={r.ventile !== false && r.ventile !== 0} /></td>
              </tr>
            ))}
            {d.balance.length === 0 && (
              <tr><td colSpan={5} style={{ color: "#2E7D32" }}>Tous les clients sont à jour de leurs règlements.</td></tr>
            )}
          </tbody>
        </table>

        <Bandeau>E · TRÉSORERIE DES FORMALITÉS</Bandeau>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Compteur valeur={d.formalites.depense} libelle="Dépensé en formalités" ton="orange" />
          <Compteur valeur={d.formalites.a_rembourser} libelle="À rembourser par les clients" ton="rouge" />
          <Compteur valeur={d.formalites.debours} libelle="Débours engagés" ton="orange" />
          <div style={{ background: "#fff", border: "0.5px solid #D9DEE8", borderLeft: "4px solid #B03030",
                        borderRadius: "0 8px 8px 0", padding: "9px 13px", minWidth: 138 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#B03030" }}>{d.formalites.dossiers_droits_impayes}</div>
            <div style={{ fontSize: 10.5, color: "#5A6478", marginTop: 2 }}>Dossiers aux droits impayés</div>
          </div>
        </div>
      </main>
    </>
  );
}
