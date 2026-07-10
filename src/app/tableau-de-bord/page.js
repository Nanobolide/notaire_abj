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
  const [admin, setAdmin] = useState(false);
  const [demoEnCours, setDemoEnCours] = useState(false);
  const charger = () =>
    fetch("/api/dashboard").then((r) => r.json())
      .then((d) => (d.erreur ? setErreur(d.erreur) : setS(d)))
      .catch(() => setErreur("Chargement impossible."));
  useEffect(() => { charger(); }, []);
  useEffect(() => { fetch("/api/session").then((r) => r.json())
    .then((d) => setAdmin(d.role === "admin_etude" || d.role === "super_admin")); }, []);

  const chargerDemo = async () => {
    setDemoEnCours(true); setErreur("");
    const rep = await fetch("/api/demo", { method: "POST" });
    const d = await rep.json();
    if (!rep.ok) setErreur(d.erreur);
    setDemoEnCours(false); charger();
  };
  const effacerDemo = async () => {
    if (!confirm("Effacer TOUTES les données de démonstration ? Les registres redeviendront vides.")) return;
    setDemoEnCours(true); setErreur("");
    const rep = await fetch("/api/demo", { method: "DELETE" });
    const d = await rep.json();
    if (!rep.ok) setErreur(d.erreur);
    setDemoEnCours(false); charger();
  };

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Tableau de bord</h1>
        <p className="sous-titre">Toutes les statistiques de l'étude, mises à jour en temps réel</p>
        {erreur && <div className="erreur">{erreur}</div>}
        {!s && !erreur && <p>Chargement…</p>}
        {s && (<>
          {s.presence && (
            <div className="presence-carte">
              <h2>👥 Qui est connecté en ce moment</h2>
              <div className="desc">Visible par le Notaire uniquement — « connecté » = actif il y a moins de 5 minutes.</div>
              {s.presence.map((u, i) => {
                const enLigne = u.en_ligne;
                const quand = u.derniere_activite
                  ? new Date(u.derniere_activite).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                  : "jamais connecté";
                const roleTxt = u.role === "admin_etude" ? "Notaire" : (u.fonction || "Collaborateur");
                return (
                  <div className="pers" key={i}>
                    <span className={"pt " + (enLigne ? "on" : "off")} />
                    <span className="p-nom">{u.nom_affiche}</span>
                    <span className="p-role">{roleTxt}</span>
                    <span className={"p-etat " + (enLigne ? "vert" : "gris")}>
                      {enLigne ? "● Connecté" : "Hors ligne — " + quand}</span>
                  </div>
                );
              })}
            </div>
          )}
          {admin && s.actes && s.appels && Number(s.actes?.total) === 0 && Number(s.appels?.total) === 0 && (
            <div className="carte" style={{ borderLeft: "4px solid var(--or)", borderRadius: "0 8px 8px 0" }}>
              <h1 style={{ fontSize: 15 }}>Registres vides — voulez-vous tester avec des données fictives ?</h1>
              <p className="sous-titre">Charge 30 actes et 30 appels de démonstration (avril-juin 2026), identiques
                au classeur Excel, pour voir couleurs, barèmes et tableau de bord en action.</p>
              <button className="bouton" onClick={chargerDemo} disabled={demoEnCours}>
                {demoEnCours ? "Chargement…" : "Charger les données de démonstration"}
              </button>
            </div>
          )}
          {admin && s.actes && Number(s.actes?.total) > 0 && (
            <p className="sous-titre" style={{ textAlign: "right" }}>
              <button className="bouton secondaire" style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={effacerDemo} disabled={demoEnCours}>
                {demoEnCours ? "…" : "Effacer les données de démonstration"}
              </button>
            </p>
          )}

          {/* ======== ① ACTES ======== */}
          {s.actes && (<>
          <div className="bandeau-section">① SUIVI DES ACTES ET MINUTES</div>
          <div className="compteurs">
            <Compteur valeur={s.actes?.total} libelle="Total dossiers" />
            <Compteur valeur={s.actes?.en_cours} libelle="En cours" />
            <Compteur valeur={s.actes?.termines} libelle="Terminés" />
            <Compteur valeur={s.actes?.annules} libelle="Annulés" />
            <Compteur valeur={"⚠ " + s.actes?.echeances_depassees} libelle="Échéances dépassées" niveau={Number(s.actes?.echeances_depassees) > 0 ? "avert" : ""} />
            <Compteur valeur={"🔴 " + s.actes?.critiques} libelle="Délai final dépassé" niveau={Number(s.actes?.critiques) > 0 ? "alerte" : ""} />
          </div>
          </>)}

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
          {s.appels && (<>
          <div className="bandeau-section" style={{ marginTop: 22 }}>② JOURNAL DES APPELS ET COURRIERS</div>
          <div className="compteurs">
            <Compteur valeur={s.appels?.total} libelle="Total entrées" />
            <Compteur valeur={s.appels?.resolus} libelle="Résolus" />
            <Compteur valeur={s.appels?.en_cours} libelle="En cours" />
            <Compteur valeur={s.appels?.en_attente} libelle="En attente du Clerc" />
            <Compteur valeur={"⚠ " + s.appels?.tentatives_3plus} libelle="Tentatives ≥ 3" niveau={Number(s.appels?.tentatives_3plus) > 0 ? "avert" : ""} />
            <Compteur valeur={"🚨 " + s.appels?.urgents} libelle="Alertes 🚨 (> 5 j)" niveau={Number(s.appels?.urgents) > 0 ? "alerte" : ""} />
          </div>
          </>)}

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
          {s.finances && (
          <>
            <div className="bandeau-section">③ TABLEAU DE BORD — COMPTABILITÉ</div>
            <div className="compteurs">
              <Compteur valeur={formatFcfa(s.finances.emoluments)} libelle="Émoluments — revenu de l'étude" niveau="ok" />
              <Compteur valeur={formatFcfa(s.finances.total_facture)} libelle="Total des frais facturés" />
              <Compteur valeur={formatFcfa(s.finances.honoraires_regles)} libelle="Encaissé" niveau="ok" />
              <Compteur valeur={formatFcfa(s.finances.reste_a_payer)} libelle="Reste à recouvrer" niveau="alerte" />
            </div>
            {Number(s.finances.dossiers_a_ventiler) > 0 && (
              <p style={{ fontSize: 11.5, color: "#6B7383", background: "#F1F3F7", borderRadius: 7,
                          padding: "8px 11px", marginBottom: 10 }}>
                📋 <strong>{s.finances.dossiers_a_ventiler}</strong> dossier
                {Number(s.finances.dossiers_a_ventiler) > 1 ? "s" : ""} en attente de ventilation.
              </p>
            )}
            <p style={{ marginBottom: 18 }}>
              <a className="bouton secondaire" href="/comptabilite">Ouvrir le détail comptable →</a>
            </p>
          </>
          )}
        </>)}
      </main>
    </>
  );
}
