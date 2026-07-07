import "./globals.css";

export const metadata = {
  title: "NOTARIA — Gestion notariale",
  description: "Plateforme SaaS multi-études de gestion notariale",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <footer style={{ textAlign: "center", padding: "14px", fontSize: "11.5px", color: "#8A94A8" }}>
          Outil de suivi interne de l'étude — ne remplace en aucun cas les registres officiels
          (répertoire des minutes). Données couvertes par le secret professionnel.{" "}
          <a href="/mentions-legales" style={{ color: "#8A94A8", textDecoration: "underline" }}>
            Mentions légales & protection des données (loi 2013-450)</a>.
        </footer>
      </body>
    </html>
  );
}
