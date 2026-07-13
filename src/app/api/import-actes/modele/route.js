import { exigerAdmin } from "@/lib/auth";
import ExcelJS from "exceljs";

/** P7 — Modèle Excel vierge à remplir pour importer les anciens dossiers d'une étude. */
export async function GET() {
  try {
    await exigerAdmin();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Dossiers à importer");

    const colonnes = [
      ["N° minute *", "numero_minute", 16, "Obligatoire. Ex. 2026/0125"],
      ["N° dossier", "numero_dossier", 14, "Facultatif"],
      ["Nature de l'acte", "nature_acte", 20, "Ex. Vente, Succession, Donation…"],
      ["Client (partie 1) *", "client", 26, "Obligatoire. Nom du client principal"],
      ["Conservation Foncière", "conservation_fonciere", 20, "Ex. Cocody, Bingerville…"],
      ["Étape / Statut", "progression", 22, "Ex. Rédaction, Signature, Terminé…"],
      ["Responsable", "responsable", 20, "Laisser vide = le Notaire"],
      ["Total des frais (FCFA)", "honoraires_totaux", 18, "Ce que paie le client"],
      ["Montant versé (FCFA)", "montant_regle", 18, "Déjà payé par le client"],
      ["Date d'ouverture", "date_ouverture", 15, "JJ/MM/AAAA"],
    ];

    // Ligne de notice
    ws.mergeCells(1, 1, 1, colonnes.length);
    const notice = ws.getCell(1, 1);
    notice.value = "NOTARIA — Modèle d'import. Remplissez une ligne par dossier à partir de la ligne 3. Les colonnes marquées * sont obligatoires. Ne modifiez pas la ligne d'en-tête (ligne 2).";
    notice.font = { italic: true, color: { argb: "FF5A6478" }, size: 10 };
    notice.alignment = { wrapText: true, vertical: "middle" };
    ws.getRow(1).height = 34;

    // En-têtes
    const enTete = ws.getRow(2);
    colonnes.forEach((c, i) => {
      const cell = enTete.getCell(i + 1);
      cell.value = c[0];
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.note = c[3];
      ws.getColumn(i + 1).width = c[2];
    });
    enTete.height = 28;

    // Deux lignes d'exemple grisées
    const exemples = [
      ["2026/0125", "D-0125", "Vente", "M. KOUADIO Jean", "Cocody", "Rédaction", "", 1750000, 500000, "15/01/2026"],
      ["2026/0126", "", "Succession", "Hoirie YAO", "Bingerville", "Terminé", "", 4410000, 4410000, "20/01/2026"],
    ];
    exemples.forEach((ex) => {
      const r = ws.addRow(ex);
      r.eachCell((cell) => { cell.font = { italic: true, color: { argb: "FF9AA3B2" } }; });
    });
    ws.addRow([]);

    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="NOTARIA_modele_import.xlsx"',
      },
    });
  } catch (e) { return new Response(JSON.stringify({ erreur: e.message }), { status: e.status || 500 }); }
}
