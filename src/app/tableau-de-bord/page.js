"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Entete from "@/components/Entete";
import { formatFcfa } from "@/lib/regles";

const Bloc = ({ titre, children, lien }) => (
  <div className="carte" style={{ marginTop: 14 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1 style={{ fontSize: 15 }}>{titre}</h1>
      {lien && <Link className="lien-detail" href={lien}>Voir le détail →</Link>}
    </div>
    {children}
  </div>
);

const Compteur = ({ valeur, libelle, niveau }) => (
  <div className={"compteur" + (niveau ? " " + niveau : "")}>
    <div className="valeur">{valeur}</div>
    <div className="libelle">{libelle}</div>
  </div>
);

export default function TableauDeBord() {
  const [s, setS] = useState(null);
  const [erreur, setErreur] = useState("");
  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json())
      .then((d) => (d.erreur ? setErreur(d.erreur) : setS(d)))
      .catch(() => setErreur("Chargement impossible."));
  }, []);

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Tableau de bord</h1>
        <p className="sous-titre">Toutes les statistiques de l'étude, mises à jour en temps réel</p>
        {erreur && <div className="erreur">{erreur}</div>}
        {!s && !erreur && <p>Chargement…</p>}
        {s && (<>

          {/* ======== ① ACTES ======== */}
          <div className="bandeau-section">① SUIVI DES ACTES ET MINUTES</div>
          <div className="compteurs">
            <Compteur valeur={s.actes.total} libelle="Total dossiers" />
            <Compteur valeur={s.actes.en_cours} libelle="En cours" />
            <Compteur valeur={s.actes.termines} libelle="Terminés" />
            <Compteur valeur={s.actes.annules} libelle="Annulés" />
            <Compteur valeur={"⚠ " + s.actes.echeances_depassees} libelle="Échéances dépassées" niveau={Number(s.actes.echeances_depassees) > 0 ? "avert" : ""} />
            <Compteur valeur={"🔴 " + s.actes.critiques} libelle="Délai final dépassé" niveau={Number(s.actes.critiques) > 0 ? "alerte" : ""} />
          </div>

          {s.finances && (
          <Bloc titre="Suivi financier (FCFA) — tous dossiers confondus — visible par le Notaire uniquement" lien="/actes?vue=registre">
            <table className="registre">
              <tbody>
                <tr><td>Total des honoraires (tous dossiers)</td><td className="montant">{formatFcfa(s.finances.honoraires_totaux)}</td></tr>
                <tr><td>Total des honoraires réglés</td><td className="montant">{formatFcfa(s.finances.honoraires_regles)}</td></tr>
                <tr><td>Total des honoraires restant à payer</td><td className="montant" style={{ fontWeight: 700 }}>{formatFcfa(s.finances.reste_a_payer)}</td></tr>
                <tr><td>Total des valeurs des actes</td><td className="montant">{formatFcfa(s.finances.valeur_totale)}</td></tr>
                <tr className="zoom"><td>— Zoom : honoraires des seuls dossiers en cours</td><td className="montant">{formatFcfa(s.finances.zoom_honoraires_en_cours)}</td></tr>
                <tr className="zoom"><td>— Zoom : valeur des seuls actes en cours</td><td className="montant">{formatFcfa(s.finances.zoom_valeur_en_cours)}</td></tr>
              </tbody>
            </table>
          </Bloc>
          )}

          <Bloc titre="Analyse par Conservation Foncière" lien="/actes?vue=registre">
            {s.parConservation.length === 0 ? <p className="sous-titre">Aucun acte saisi pour l'instant.</p> : (
              <table className="registre">
                <thead><tr><th>Conservation Foncière</th><th>Dossiers</th><th>En cours</th><th>Terminés</th><th>Échéances dépassées</th></tr></thead>
                <tbody>
                  {s.parConservation.map((z) => (
                    <tr key={z.conservation_fonciere} style={Number(z.depassees) > 0 ? { background: "#FFC7CE" } : undefined}>
                      <td>{z.conservation_fonciere}</td><td>{z.dossiers}</td><td>{z.en_cours}</td>
                      <td>{z.termines}</td><td style={{ fontWeight: Number(z.depassees) > 0 ? 700 : 400 }}>{z.depassees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Bloc>

          <div className="deux-colonnes">
            <Bloc titre="Répartition par étape (dossiers en cours)">
              {s.parEtape.length === 0 ? <p className="sous-titre">Aucun dossier en cours.</p> : (
                <table className="registre">
                  <thead><tr><th>Étape</th><th>Dossiers</th></tr></thead>
                  <tbody>{s.parEtape.map((e) => (
                    <tr key={e.etape}><td>{e.etape}</td><td>{e.dossiers}</td></tr>))}
                  </tbody>
                </table>
              )}
            </Bloc>
            <Bloc titre="Répartition par responsable (actes)">
              {s.parResponsable.length === 0 ? <p className="sous-titre">Aucun responsable renseigné.</p> : (
                <table className="registre">
                  <thead><tr><th>Responsable</th><th>Total</th><th>Terminés</th><th>En cours</th><th>Dépassées</th></tr></thead>
                  <tbody>{s.parResponsable.map((p) => (
                    <tr key={p.responsable}><td>{p.responsable}</td><td>{p.total}</td>
                      <td>{p.termines}</td><td>{p.en_cours}</td>
                      <td style={{ color: Number(p.depassees) > 0 ? "#C00000" : undefined, fontWeight: 600 }}>{p.depassees}</td></tr>))}
                  </tbody>
                </table>
              )}
            </Bloc>
          </div>

          {/* ======== ② APPELS ======== */}
          <div className="bandeau-section" style={{ marginTop: 22 }}>② JOURNAL DES APPELS ET COURRIERS</div>
          <div className="compteurs">
            <Compteur valeur={s.appels.total} libelle="Total entrées" />
            <Compteur valeur={s.appels.resolus} libelle="Résolus" />
            <Compteur valeur={s.appels.en_cours} libelle="En cours" />
            <Compteur valeur={s.appels.en_attente} libelle="En attente du Clerc" />
            <Compteur valeur={"⚠ " + s.appels.tentatives_3plus} libelle="Tentatives ≥ 3" niveau={Number(s.appels.tentatives_3plus) > 0 ? "avert" : ""} />
            <Compteur valeur={"🚨 " + s.appels.urgents} libelle="Alertes 🚨 (> 5 j)" niveau={Number(s.appels.urgents) > 0 ? "alerte" : ""} />
          </div>

          <div className="deux-colonnes">
            <Bloc titre="Répartition par type de flux" lien="/appels?vue=registre">
              {s.parFlux.length === 0 ? <p className="sous-titre">Aucune entrée pour l'instant.</p> : (
                <table className="registre">
                  <thead><tr><th>Type de flux</th><th>Nombre</th></tr></thead>
                  <tbody>{s.parFlux.map((f) => (
                    <tr key={f.type_flux}><td>{f.type_flux}</td><td>{f.nombre}</td></tr>))}
                  </tbody>
                </table>
              )}
            </Bloc>
            <Bloc titre="Répartition par motif">
              {s.parMotif.length === 0 ? <p className="sous-titre">Aucun motif renseigné.</p> : (
                <table className="registre">
                  <thead><tr><th>Motif</th><th>Nombre</th></tr></thead>
                  <tbody>{s.parMotif.map((m) => (
                    <tr key={m.motif}><td>{m.motif}</td><td>{m.nombre}</td></tr>))}
                  </tbody>
                </table>
              )}
            </Bloc>
          </div>

          <Bloc titre="Répartition par collaborateur / service" lien="/appels?vue=registre">
            {s.parCollaborateur.length === 0 ? <p className="sous-titre">Aucun destinataire renseigné.</p> : (
              <table className="registre">
                <thead><tr><th>Collaborateur / Service</th><th>Total</th><th>Résolus</th><th>Non résolus</th><th>Alertes 🚨</th></tr></thead>
                <tbody>{s.parCollaborateur.map((d) => (
                  <tr key={d.destinataire}><td>{d.destinataire}</td><td>{d.total}</td><td>{d.resolus}</td>
                    <td>{d.non_resolus}</td>
                    <td style={{ color: Number(d.urgents) > 0 ? "#C00000" : undefined, fontWeight: 600 }}>{d.urgents}</td></tr>))}
                </tbody>
              </table>
            )}
          </Bloc>
        </>)}
      </main>
    </>
  );
}
