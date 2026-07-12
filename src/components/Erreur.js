/** Bandeau d'erreur — répété tel quel dans actes/comptes/appels. */
export default function Erreur({ message }) {
  if (!message) return null;
  return <div className="erreur">{message}</div>;
}
