"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { lireJson } from "@/lib/http";
import { formatFcfa } from "@/lib/regles";

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/saas/dashboard").then(lireJson).then((r) => {
      if (r.erreur) setErreur(r.erreur);
      else setD(r);
    });
  }, []);

  if (erreur) return <div className="erreur">{erreur}</div>;
  if (!d) return <p>Chargement…</p>;

  const c = (v, lib, cls) => (
    <div className={"compteur" + (cls ? " " + cls : "")}>
      <div className="valeur">{v}</div>
      <div className="libelle">{lib}</div>
    </div>
  );

  return (
    <>
      <h1>Administration plateforme</h1>
      <p className="sous-titre">Vue d'ensemble SaaS — tenants, abonnements, facturation et support.</p>
      <div className="compteurs">
        {c(d.tenants?.total_tenants ?? 0, "Études inscrites")}
        {c(d.tenants?.actifs ?? 0, "Tenants actifs")}
        {c(d.subscriptions?.subscriptions_actives ?? 0, "Abonnements actifs")}
        {c(formatFcfa(d.invoices?.revenus_payes ?? 0), "Revenus encaissés", "argent")}
        {c(d.support?.tickets_ouverts ?? 0, "Tickets ouverts", "avert")}
      </div>
      <div className="carte" style={{ marginTop: 16 }}>
        <h1 style={{ fontSize: 15 }}>Actions rapides</h1>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Link className="bouton" href="/admin/etudes">+ Créer une étude</Link>
          <Link className="bouton secondaire" href="/admin/plans">Gérer les plans</Link>
          <Link className="bouton secondaire" href="/admin/support">Voir le support</Link>
        </p>
      </div>
    </>
  );
}
