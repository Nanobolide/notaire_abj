import "./globals.css";

export const metadata = {
  title: "NOTARIA — Cabinet notarial Me KOUASSI",
  description: "Outil de gestion interne pour étude notariale : appels, courriers, actes et minutes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <footer style={{ textAlign: "center", padding: "14px", fontSize: "11.5px", color: "#8A94A8" }}>
          Outil de suivi interne de l'étude — ne remplace en aucun cas les registres officiels
          (répertoire des minutes). Données couvertes par le secret professionnel.
        </footer>
      </body>
    </html>
  );
}
