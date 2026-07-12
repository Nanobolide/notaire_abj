/** Pagination de registre — identique sur actes/appels, juste l'unité affichée change. */
export default function Pagination({ page, totalPages, total, unite, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="bouton secondaire" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Précédent</button>
      <span>Page {page} / {totalPages} — {total} {unite}</span>
      <button className="bouton secondaire" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Suivant →</button>
    </div>
  );
}
