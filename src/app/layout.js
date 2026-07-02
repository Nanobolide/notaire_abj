import "./globals.css";

export const metadata = {
  title: "NOTARIA — Gestion notariale",
  description: "Plateforme SaaS multi-études de gestion notariale",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
