"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const LIENS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/etudes", label: "Études" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/abonnements", label: "Abonnements" },
  { href: "/admin/licences", label: "Licences" },
  { href: "/admin/factures", label: "Factures" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/parametres", label: "Paramètres" },
];

export default function AdminEntete() {
  const chemin = usePathname();
  const routeur = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetch("/api/session").then((r) => r.json()).then((d) => {
      if (d.erreur || d.role !== "super_admin") { routeur.push("/connexion"); return; }
      if (d.doitChangerMdp) { routeur.push("/changer-mot-de-passe"); return; }
      setSession(d);
    }).catch(() => routeur.push("/connexion"));
  }, [routeur]);

  const deconnexion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    routeur.push("/connexion");
  };

  return (
    <header className="entete admin-entete">
      <div className="bloc-gauche">
        <div className="marque">NOTARIA<span>.</span> <span style={{ fontSize: 11, fontWeight: 400, color: "#E4D3A0" }}>ADMIN</span></div>
        {session?.nom && <div className="connecte"><span className="point" /> {session.nom} — Super-Admin</div>}
      </div>
      <nav className="admin-nav">
        {LIENS.map((l) => (
          <Link key={l.href} href={l.href} className={chemin === l.href ? "actif" : ""}>{l.label}</Link>
        ))}
      </nav>
      <button className="bouton secondaire" style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12 }}
        onClick={deconnexion}>Déconnexion</button>
    </header>
  );
}
