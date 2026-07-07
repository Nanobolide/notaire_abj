"use client";
import { useEffect, useState } from "react";
import Entete from "@/components/Entete";

export default function MentionsLegales() {
  const [nom, setNom] = useState("");
  useEffect(() => { fetch("/api/session").then((r) => r.json()).then((d) => setNom(d.etudeNom || "")); }, []);
  return (
    <>
      <Entete />
      <main className="page" style={{ maxWidth: 820 }}>
        <h1>Mentions légales & protection des données</h1>
        <p className="sous-titre">{nom}</p>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Nature de l'outil</h1>
          <p>NOTARIA est un outil interne de suivi de l'activité de l'étude (appels, courriers,
          avancement des actes). Il ne constitue pas un registre officiel et ne remplace en aucun
          cas le répertoire des minutes ni les registres légaux tenus par l'étude.</p>
        </div>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Protection des données personnelles (loi n° 2013-450)</h1>
          <p>Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection
          des données à caractère personnel :</p>
          <ul>
            <li><strong>Responsable du traitement</strong> : le Notaire titulaire de l'étude {nom}.</li>
            <li><strong>Finalité</strong> : suivi interne des dossiers et de la relation client ; aucune
              cession à des tiers, aucune finalité commerciale.</li>
            <li><strong>Données traitées</strong> : identité et coordonnées des clients, références et
              état d'avancement des dossiers.</li>
            <li><strong>Accès</strong> : réservé au Notaire et aux collaborateurs habilités de l'étude,
              chacun disposant d'un identifiant personnel. Les données financières sont réservées au Notaire.</li>
            <li><strong>Conservation</strong> : les données sont conservées le temps nécessaire au suivi,
              puis archivées conformément aux obligations de conservation applicables aux actes notariés.
              Un export est réalisé avant toute purge.</li>
            <li><strong>Droits des personnes</strong> : droit d'accès, de rectification et d'opposition,
              à exercer auprès de l'étude.</li>
            <li><strong>Déclaration ARTCI</strong> : le traitement relève des formalités auprès de
              l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire. Référence de
              déclaration à compléter par l'étude : ______________________.</li>
          </ul>
          <p className="sous-titre">Ce texte est un modèle de base à faire valider par l'étude et, le cas
          échéant, par son conseil, avant toute exploitation de données réelles de clients.</p>
        </div>

        <div className="carte">
          <h1 style={{ fontSize: 15 }}>Sécurité & secret professionnel</h1>
          <p>Les données sont couvertes par le secret professionnel notarial. L'accès est protégé par
          mot de passe individuel ; les actions sensibles sont journalisées de façon inaltérable.
          Toute suppression passe par une corbeille de 30 jours avant effacement définitif.</p>
        </div>
      </main>
    </>
  );
}
