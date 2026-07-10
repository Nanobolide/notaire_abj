import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth";
import { voitFinancier } from "@/lib/acces";
import { withTenant } from "@/lib/db";
import { isPg } from "@/lib/dialect";

function fragments() {
  const total = `honoraires_totaux`;
  const ventile = `(emoluments + droits_etat + debours + autres_depenses)`;
  const estVentile = `(${ventile} > 0)`;
  const enCours = isPg()
    ? "count(*) FILTER (WHERE progression NOT IN ('Terminé','Annulé'))"
    : "SUM(CASE WHEN progression NOT IN ('Terminé','Annulé') THEN 1 ELSE 0 END)";
  const dossiersAVentiler = isPg()
    ? `count(*) FILTER (WHERE NOT ${estVentile})`
    : `SUM(CASE WHEN NOT ${estVentile} THEN 1 ELSE 0 END)`;
  const droitsImpayes = isPg()
    ? "count(*) FILTER (WHERE droits_etat > 0 AND montant_regle < droits_etat)"
    : "SUM(CASE WHEN droits_etat > 0 AND montant_regle < droits_etat THEN 1 ELSE 0 END)";
  const n = (expr) => (isPg() ? `COALESCE(${expr},0)::bigint` : `COALESCE(${expr},0)`);
  const entier = (expr) => (isPg() ? `${expr}::int` : `CAST(${expr} AS INTEGER)`);
  return { total, ventile, estVentile, enCours, dossiersAVentiler, droitsImpayes, n, entier };
}

export async function GET() {
  try {
    const s = await exigerSession();
    if (!voitFinancier(s))
      return NextResponse.json({ erreur: "Réservé au Notaire et au Comptable." }, { status: 403 });

    const f = fragments();
    const filtre = "etude_id = $1 AND supprime_le IS NULL AND progression <> 'Annulé'";

    const data = await withTenant(s.etudeId, async (c) => {
      const { rows: [g] } = await c.query(`
        SELECT ${f.n("SUM(emoluments)")} AS emoluments,
               ${f.n("SUM(droits_etat)")} AS droits_etat,
               ${f.n("SUM(debours)")} AS debours,
               ${f.n("SUM(autres_depenses)")} AS autres_depenses,
               ${f.n("SUM(depenses_formalites)")} AS depenses_formalites,
               ${f.n(`SUM(${f.total})`)} AS total_facture,
               ${f.n(`SUM(${f.ventile})`)} AS total_ventile,
               ${f.n("SUM(montant_regle)")} AS encaisse,
               ${f.n(`SUM(${f.total}) - SUM(montant_regle)`)} AS reste_a_recouvrer,
               ${f.entier(f.dossiersAVentiler)} AS dossiers_a_ventiler,
               ${f.n("SUM(debours)")} AS debours_total
        FROM actes WHERE ${filtre}`, [s.etudeId]);

      const { rows: parNature } = await c.query(`
        SELECT nature_acte, ${f.entier("count(*)")} AS dossiers,
               ${f.n("SUM(emoluments)")} AS emoluments,
               ${f.n("SUM(droits_etat)")} AS droits_etat,
               ${f.n("SUM(debours + depenses_formalites + autres_depenses)")} AS depenses,
               ${f.n(`SUM(${f.total})`)} AS total_facture,
               ${f.n("SUM(montant_regle)")} AS encaisse,
               ${f.n(`SUM(${f.total}) - SUM(montant_regle)`)} AS reste
        FROM actes WHERE ${filtre}
        GROUP BY nature_acte ORDER BY emoluments DESC`, [s.etudeId]);

      const { rows: parCollaborateur } = await c.query(`
        SELECT COALESCE(responsable,'(non attribué)') AS responsable,
               ${f.entier("count(*)")} AS dossiers,
               ${f.entier(f.enCours)} AS en_cours,
               ${f.n("SUM(emoluments)")} AS emoluments,
               ${f.n("SUM(debours)")} AS debours,
               ${f.n("SUM(montant_regle)")} AS encaisse,
               ${f.n(`SUM(${f.total}) - SUM(montant_regle)`)} AS reste
        FROM actes WHERE ${filtre}
        GROUP BY responsable ORDER BY emoluments DESC`, [s.etudeId]);

      const { rows: balance } = await c.query(`
        SELECT p.nom_partie AS client,
               ${f.entier("count(DISTINCT a.id)")} AS dossiers,
               ${f.n(`SUM(${f.total})`)} AS facture,
               ${f.n("SUM(a.montant_regle)")} AS encaisse,
               ${f.n(`SUM(${f.total}) - SUM(a.montant_regle)`)} AS solde
        FROM actes a
        JOIN acte_parties p ON p.acte_id = a.id AND p.ordre = 1 AND p.etude_id = a.etude_id
        WHERE a.etude_id = $1 AND a.supprime_le IS NULL AND a.progression <> 'Annulé'
        GROUP BY p.nom_partie
        HAVING COALESCE(SUM(${f.total}) - SUM(a.montant_regle),0) <> 0
        ORDER BY solde DESC LIMIT 30`, [s.etudeId]);

      const { rows: [formalites] } = await c.query(`
        SELECT ${f.n("SUM(depenses_formalites)")} AS depense,
               ${f.n("SUM(debours)")} AS debours,
               ${f.entier(f.droitsImpayes)} AS dossiers_droits_impayes
        FROM actes WHERE ${filtre}`, [s.etudeId]);

      return { global: g, parNature, parCollaborateur, balance, formalites };
    });
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
