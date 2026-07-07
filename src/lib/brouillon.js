"use client";
import { useEffect } from "react";

/**
 * Sauvegarde le formulaire en cours dans le navigateur (localStorage) à chaque frappe.
 * Si une coupure internet, une fermeture d'onglet ou une expiration de session survient,
 * la saisie est retrouvée intacte à la réouverture. Effacé après enregistrement réussi.
 */
export function useBrouillon(cle, form, setForm, actif = true) {
  // Restauration au montage
  useEffect(() => {
    if (!actif) return;
    try {
      const sauve = localStorage.getItem(cle);
      if (sauve) {
        const data = JSON.parse(sauve);
        if (data && Object.keys(data).length && confirm(
          "Une saisie non enregistrée a été retrouvée (peut-être après une coupure). La restaurer ?"))
          setForm(data);
        else localStorage.removeItem(cle);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Sauvegarde à chaque changement
  useEffect(() => {
    if (!actif) return;
    try { localStorage.setItem(cle, JSON.stringify(form)); } catch {}
  }, [cle, form, actif]);
}

export function effacerBrouillon(cle) {
  try { localStorage.removeItem(cle); } catch {}
}
