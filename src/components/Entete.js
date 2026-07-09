"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Entete() {
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

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const clic = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOuvert(false); };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, []);

  const deconnexion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    routeur.push("/connexion");
  };
  const lien = (href, texte) => (
    <Link href={href} className={chemin === href ? "actif" : ""}>{texte}</Link>
  );
  const admin = session && (session.role === "admin_etude" || session.role === "super_admin");
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
        {lien("/appels", "Appels & Courriers")}
        {lien("/actes", "Actes & Minutes")}
      </nav>
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
