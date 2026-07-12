"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Cloche from "./Cloche";

export default function Entete() {
  const [offresVisibles, setOffresVisibles] = useState(false);
  const chemin = usePathname();
  const routeur = useRouter();
  const [session, setSession] = useState(null);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetch("/api/session").then((r) => r.json()).then((d) => {
      if (d.doitChangerMdp) { routeur.push("/changer-mot-de-passe"); return; }
      if (d.role === "super_admin") { routeur.push("/admin"); return; }
      setSession(d);
    }).catch(() => {});
  }, [routeur]);

  useEffect(() => {
    const clic = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOuvert(false); };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, []);

  const deconnexion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    routeur.push("/connexion");
  };
  useEffect(() => {
    fetch("/api/offres").then((r) => r.json())
      .then((d) => setOffresVisibles(!!(d && d.actif && d.autorise)))
      .catch(() => {});
  }, []);

  const lien = (href, texte) => (
    <Link href={href} className={chemin === href ? "actif" : ""}>{texte}</Link>
  );
  const niveau = session?.niveauAcces || (session?.role === "admin_etude" ? "administrateur" : "standard");
  const admin = niveau === "administrateur" || session?.role === "super_admin";
  const sansActes = session?.fonction === "Accueil" || session?.fonction === "Archiviste" || niveau === "renseignement";
  const roleLisible = { admin_etude: "Notaire", super_admin: "Super-Admin", collaborateur: session?.fonction || "Collaborateur" }[session?.role] || "";

  const item = (href, ic, titre, desc) => (
    <Link href={href} className="menu-item" onClick={() => setMenuOuvert(false)}>
      <span className="ic">{ic}</span>
      <span><span className="t">{titre}</span>{desc && <span className="d">{desc}</span>}</span>
    </Link>
  );

  return (
    <header className="entete">
      <div className="bloc-gauche">
        <div className="marque">NOTARIA<span>.</span></div>
        {session?.etudeNom && <div className="nom-etude">{session.etudeNom}</div>}
        {session?.nom && (
          <div className="connecte"><span className="point" /> {session.nom}
            {roleLisible && <span className="role"> — {roleLisible}</span>}</div>
        )}
      </div>
      <nav>
        {lien("/tableau-de-bord", "Tableau de bord")}
        {!sansActes && lien("/actes", "Actes & Minutes")}
        {lien("/appels", "Appels & Courriers")}
        {offresVisibles && lien("/offres", "Offres")}
      </nav>
      <Cloche actif={!!session?.etudeNom} />
      <div className="zone-param" ref={ref}>
        <button className="param-btn" onClick={() => setMenuOuvert(!menuOuvert)}>⚙ Paramètres ▾</button>
        {menuOuvert && (
          <div className="menu-param">
            {admin && <>
              <div className="grp-titre">Administration</div>
              {item("/comptes", "👥", "Comptes", "Collaborateurs & accès")}
              {item("/corbeille", "🗑️", "Corbeille", "Restaurer les éléments supprimés")}
              <div className="grp-titre">Réglages</div>
              {item("/parametres", "⏱️", "Délais & barèmes", "Couleurs d'alerte par type")}
            </>}
            {item("/changer-mot-de-passe", "🔑", "Changer mon mot de passe", null)}
            {item("/avis", "💬", "Votre avis sur l'application", "Anonyme")}
            {item("/mentions-legales", "⚖️", "Mentions légales", null)}
            <button className="menu-item deco" onClick={deconnexion}>
              <span className="ic">⏻</span><span className="t">Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
