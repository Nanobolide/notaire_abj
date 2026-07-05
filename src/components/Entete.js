"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Entete() {
  const chemin = usePathname();
  const routeur = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .catch(() => {});
  }, []);

  const deconnexion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    routeur.push("/connexion");
  };
  const lien = (href, texte) => (
    <Link href={href} className={chemin === href ? "actif" : ""}>{texte}</Link>
  );
  return (
    <header className="entete">
      <div className="marque">
        NOTARIA<span>.</span>
        <small>Cabinet notarial</small>
      </div>
      <nav>
        {lien("/tableau-de-bord", "Tableau de bord")}
        {lien("/appels", "Appels & Courriers")}
        {lien("/actes", "Actes & Minutes")}
      </nav>
      <div className="session">
        {session?.nom && <span className="nom-utilisateur">{session.nom}</span>}
        <button className="bouton secondaire" style={{ padding: "5px 12px" }} onClick={deconnexion}>
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
