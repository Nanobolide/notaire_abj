import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { exigerSession } from "@/lib/auth";
import { voitRegistreActes, voitRegistreAppels, voitMontants } from "@/lib/acces";
import { withTenant } from "@/lib/db";
import { couleurActe, couleurAppel, joursEcoules, respectEcheance } from "@/lib/regles";

const BLEU = "FF1F3864";
const fond = (hex) => ({ type: "pattern", pattern: "solid", fgColor: { argb: "FF" + hex.replace("#", "") } });

/** Export Excel du registre (actes ou appels) — les montants uniquement pour le Notaire. */
export async function GET(req, { params }) {
  try {
    const s = await exigerSession();
    const registre = params.registre;
    const url = new URL(req.url);
    const du = url.searchParams.get("du");
    const au = url.searchParams.get("au");
    if (!["actes", "appels"].includes(registre))
      return NextResponse.json({ erreur: "Registre inconnu." }, { status: 404 });
    // C11 — le droit d'exporter suit EXACTEMENT le droit de consulter le registre.
    if (registre === "actes" && !voitRegistreActes(s))
      return NextResponse.json({ erreur: "Vous n'avez pas accès au registre des actes." }, { status: 403 });
    if (registre === "appels" && !voitRegistreAppels(s))
      return NextResponse.json({ erreur: "Vous n'avez pas accès au registre des appels." }, { status: 403 });
    const admin = voitMontants(s);  // C12 — le Comptable voit les montants


    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(registre === "actes" ? "Suivi des Actes" : "Appels & Courriers");

    await withTenant(s.etudeId, async (c) => {
      if (registre === "actes") {
        const cond = []; const vals = [];
        if (du) { vals.push(du); cond.push(`a.date_ouverture >= $${vals.length}`); }
        if (au) { vals.push(au); cond.push(`a.date_ouverture <= $${vals.length}`); }
        const wh = cond.length ? " AND " + cond.join(" AND ") : "";
        const { rows } = await c.query(
          `SELECT a.*, COALESCE((SELECT string_agg(p.nom_partie, ' / ' ORDER BY p.ordre)
             FROM acte_parties p WHERE p.acte_id = a.id), '') AS parties
           FROM actes a WHERE a.supprime_le IS NULL ${wh} ORDER BY a.date_ouverture DESC`, vals);
        const cols = [
          ["N° minute", "numero_minute", 12], ["N° dossier", "numero_dossier", 12],
          ["Ouverture", "date_ouverture", 12], ["Échéance", "date_echeance", 12],
          ["Nature", "nature_acte", 16], ["Complexité", "complexite", 11],
          ["Parties", "parties", 28], ["Responsable", "responsable", 12],
          ["Conservation", "conservation_fonciere", 14], ["Étape / Statut", "progression", 18],
          ["Délai (j)", null, 9], ["Échéance ?", null, 11],
          ...(admin ? [["Valeur (FCFA)", "valeur_acte", 14], ["Honoraires (FCFA)", "honoraires_totaux", 15],
                       ["Réglé (FCFA)", "montant_regle", 13], ["Reste (FCFA)", null, 13],
                       ["Paiement", "statut_paiement", 11]] : []),
          ["Difficultés", "difficultes", 24], ["Observations", "observations", 24],
        ];
        ws.columns = cols.map(([h, , w]) => ({ width: w }));
        const enTete = ws.addRow(cols.map(([h]) => h));
        enTete.eachCell((cell) => { cell.fill = fond("1F3864"); cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 9 }; });
        for (const a of rows) {
          const fini = a.progression === "Terminé" || a.progression === "Annulé";
          const ligne = ws.addRow(cols.map(([, champ]) => {
            if (champ) return champ.startsWith("date") ? new Date(a[champ]).toLocaleDateString("fr-FR") : a[champ];
            return null;
          }));
          const iDelai = cols.findIndex(([h]) => h === "Délai (j)") + 1;
          ligne.getCell(iDelai).value = fini ? a.progression : joursEcoules(a.date_ouverture, a.termine_le);
          ligne.getCell(iDelai + 1).value = respectEcheance(a);
          if (admin) {
            const iReste = cols.findIndex(([h]) => h === "Reste (FCFA)") + 1;
            ligne.getCell(iReste).value = Number(a.honoraires_totaux) - Number(a.montant_regle);
          }
          const c2 = couleurActe(a);
          if (c2.fond !== "#FFFFFF") ligne.eachCell((cell) => { cell.fill = fond(c2.fond); });
          ligne.font = { size: 9 };
        }
      } else {
        const cond = []; const vals = [];
        if (du) { vals.push(du); cond.push(`a.date_entree >= $${vals.length}`); }
        if (au) { vals.push(au); cond.push(`a.date_entree <= $${vals.length}`); }
        const wh = cond.length ? " AND " + cond.join(" AND ") : "";
        const { rows } = await c.query(
          `SELECT a.*, u.nom_affiche AS saisi_par_nom FROM appels_courriers a
           LEFT JOIN utilisateurs u ON u.id = a.saisi_par
           WHERE a.supprime_le IS NULL ${wh} ORDER BY a.annee DESC, a.numero DESC`, vals);
        const cols = [["N°", 9], ["Type de flux", 18], ["Date", 11], ["Heure", 8], ["Réf. dossier", 12],
          ["Client", 22], ["Contact", 18], ["Destinataire", 13], ["Motif", 20], ["Statut", 16],
          ["Tentatives", 10], ["Jours", 8], ["Observations", 30], ["Saisi par", 14]];
        ws.columns = cols.map(([, w]) => ({ width: w }));
        const enTete = ws.addRow(cols.map(([h]) => h));
        enTete.eachCell((cell) => { cell.fill = fond("1F3864"); cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 9 }; });
        for (const a of rows) {
          const ligne = ws.addRow([
            `${a.annee}-${String(a.numero).padStart(4, "0")}`, a.type_flux,
            new Date(a.date_entree).toLocaleDateString("fr-FR"), String(a.heure).slice(0, 5),
            a.reference_dossier, a.client_nom, a.telephone || a.email, a.destinataire, a.motif,
            a.statut_traitement, a.nb_tentatives,
            a.statut_traitement === "Résolu" ? "Résolu" : joursEcoules(a.date_entree, a.resolu_le),
            a.observations, a.saisi_par_nom]);
          const c2 = couleurAppel(a);
          if (c2.fond !== "#FFFFFF") ligne.eachCell((cell) => { cell.fill = fond(c2.fond); });
          ligne.font = { size: 9 };
        }
      }
      // Journal des exports (traçabilité)
      await c.query(`INSERT INTO exports (etude_id, type_export, perimetre, demande_par)
                     VALUES ($1, 'a_la_demande', $2, $3)`, [s.etudeId, "excel_" + registre, s.uid]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const suffixe = du || au ? `_${du||"debut"}_a_${au||"fin"}` : "";
    const nom = `NOTARIA_${registre}${suffixe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer, { status: 200, headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nom}"`,
    }});
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
