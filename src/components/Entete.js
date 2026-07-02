"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Entete() {
  const chemin = usePathname();
  const routeur = useRouter();
  const deconnexion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    routeur.push("/connexion");
  };
  const lien = (href, texte) => (
    <Link href={href} className={chemin === href ? "actif" : ""}>{texte}</Link>
  );
  return (
    <header className="entete">
      <div className="marque">NOTARIA<span>.</span></div>
      <nav>
        {lien("/tableau-de-bord", "Tableau de bord")}
        {lien("/appels", "Appels & Courriers")}
        {lien("/actes", "Actes & Minutes")}
      </nav>
      <div className="session">
        <button className="bouton secondaire" style={{ padding: "5px 12px" }} onClick={deconnexion}>
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
