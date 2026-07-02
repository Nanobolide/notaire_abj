"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";
import { formatFcfa } from "@/lib/regles";

export default function TableauDeBord() {
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => (d.erreur ? setErreur(d.erreur) : setStats(d)))
      .catch(() => setErreur("Chargement impossible."));
  }, []);

  return (
    <>
      <Entete />
      <main className="page">
        <h1>Tableau de bord</h1>
        <p className="sous-titre">Vue en temps réel de l'activité de l'étude</p>
        {erreur && <div className="erreur">{erreur}</div>}
        {!stats && !erreur && <p>Chargement…</p>}
        {stats && (
          <>
            <div className="compteurs">
              <div className="compteur"><div className="valeur">{stats.appels.aujourdhui}</div>
                <div className="libelle">Appels & courriers aujourd'hui</div></div>
              <div className="compteur"><div className="valeur">{stats.appels.en_cours}</div>
                <div className="libelle">Demandes non résolues</div></div>
              <div className={"compteur" + (Number(stats.appels.alertes_72h) > 0 ? " alerte" : "")}>
                <div className="valeur">🚨 {stats.appels.alertes_72h}</div>
                <div className="libelle">Alertes 72 h actives</div></div>
              <div className={"compteur" + (Number(stats.appels.tentatives_3plus) > 0 ? " alerte" : "")}>
                <div className="valeur">{stats.appels.tentatives_3plus}</div>
                <div className="libelle">Dossiers à 3 tentatives et +</div></div>
              <div className="compteur"><div className="valeur">{stats.actes.en_cours}</div>
                <div className="libelle">Actes en cours</div></div>
              <div className={"compteur" + (Number(stats.actes.echeances_depassees) > 0 ? " alerte" : "")}>
                <div className="valeur">⚠ {stats.actes.echeances_depassees}</div>
                <div className="libelle">Échéances dépassées</div></div>
              <div className="compteur argent"><div className="valeur">{formatFcfa(stats.actes.encaisse)}</div>
                <div className="libelle">Honoraires encaissés</div></div>
              <div className="compteur argent"><div className="valeur">{formatFcfa(stats.actes.reste_a_payer)}</div>
                <div className="libelle">Reste à payer</div></div>
            </div>

            <div className="carte" style={{ marginTop: 16 }}>
              <h1 style={{ fontSize: 16 }}>Analyse par Conservation Foncière</h1>
              <p className="sous-titre">Zones les plus lentes en premier — pour objectiver les blocages</p>
              {stats.parConservation.length === 0 ? (
                <p className="sous-titre">Aucun acte saisi pour l'instant. Les registres démarrent vides.</p>
              ) : (
                <table className="registre">
                  <thead><tr><th>Conservation</th><th>Dossiers</th><th>Délai moyen (j)</th><th>En dépassement</th></tr></thead>
                  <tbody>
                    {stats.parConservation.map((z) => (
                      <tr key={z.conservation_fonciere}>
                        <td>{z.conservation_fonciere}</td>
                        <td>{z.dossiers}</td>
                        <td>{z.delai_moyen_jours}</td>
                        <td style={{ color: Number(z.en_depassement) > 0 ? "#C0392B" : undefined, fontWeight: 600 }}>
                          {z.en_depassement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="carte">
              <h1 style={{ fontSize: 16 }}>Comparatif mensuel</h1>
              <p className="sous-titre">Volume d'appels et taux de résolution sous 72 h, mois par mois</p>
              {stats.comparatif.length === 0 ? (
                <p className="sous-titre">Les comparaisons apparaîtront dès les premières saisies.</p>
              ) : (
                <table className="registre">
                  <thead><tr><th>Mois</th><th>Appels & courriers</th><th>Résolus sous 72 h</th><th>Taux</th></tr></thead>
                  <tbody>
                    {stats.comparatif.map((m) => (
                      <tr key={m.mois}>
                        <td>{m.mois}</td><td>{m.appels}</td><td>{m.resolus_sous_72h}</td>
                        <td>{m.appels > 0 ? Math.round((m.resolus_sous_72h / m.appels) * 100) + " %" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
