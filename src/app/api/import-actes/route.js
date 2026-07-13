import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { exigerAdmin } from "@/lib/auth";
import { withTenant, audit } from "@/lib/db";

const nombre = (v) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};
const texte = (v) => (v == null ? "" : String(v).trim());
const dateFr = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
};

/** Lire le classeur et produire des lignes structurées + les anomalies. */
async function analyser(fichier) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await fichier.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw Object.assign(new Error("Classeur vide."), { status: 400 });

  const lignes = [], anomalies = [];
  ws.eachRow((row, num) => {
    if (num <= 2) return;                          // notice + en-tête
    const c = (i) => row.getCell(i).value;
    const minute = texte(c(1));
    const client = texte(c(4));
    if (!minute && !client) return;                // ligne vide, ignorée
    const ligne = {
      numero_minute: minute,
      numero_dossier: texte(c(2)),
      nature_acte: texte(c(3)),
      client,
      conservation_fonciere: texte(c(5)),
      progression: texte(c(6)) || "Recensement des informations",
      responsable: texte(c(7)),
      honoraires_totaux: nombre(c(8)),
      montant_regle: nombre(c(9)),
      date_ouverture: dateFr(c(10)),
    };
    if (!minute) anomalies.push(`Ligne ${num} : n° de minute manquant.`);
    if (!client) anomalies.push(`Ligne ${num} : client manquant.`);
    if (ligne.montant_regle > ligne.honoraires_totaux && ligne.honoraires_totaux > 0)
      anomalies.push(`Ligne ${num} : montant versé supérieur au total des frais.`);
    lignes.push(ligne);
  });
  return { lignes, anomalies };
}

export async function POST(req) {
  try {
    const s = await exigerAdmin();
    const url = new URL(req.url);
    const etape = url.searchParams.get("etape") || "apercu";
    const form = await req.formData();
    const fichier = form.get("fichier");
    if (!fichier || typeof fichier === "string") { const e = new Error("Aucun fichier reçu."); e.status = 400; throw e; }

    const { lignes, anomalies } = await analyser(fichier);
    const valides = lignes.filter((l) => l.numero_minute && l.client);

    if (etape === "apercu") {
      return NextResponse.json({
        total: lignes.length, valides: valides.length,
        anomalies, apercu: valides.slice(0, 8),
      });
    }

    // etape === "confirmer" : insertion réelle, transaction, sans toucher aux dossiers existants
    if (valides.length === 0) { const e = new Error("Aucune ligne valide à importer."); e.status = 400; throw e; }
    const inserees = await withTenant(s.etudeId, async (c) => {
      let n = 0;
      for (const l of valides) {
        // on n'écrase jamais un dossier existant : on saute les doublons de n° minute
        const { rows: [exist] } = await c.query(
          `SELECT 1 FROM actes WHERE numero_minute = $1 AND supprime_le IS NULL`, [l.numero_minute]);
        if (exist) continue;
        const { rows: [acte] } = await c.query(
          `INSERT INTO actes (etude_id, numero_minute, numero_dossier, nature_acte, conservation_fonciere,
                              progression, responsable, honoraires_totaux, montant_regle, date_ouverture)
           VALUES (current_setting('app.current_etude_id')::uuid,$1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::date, now()::date))
           RETURNING id`,
          [l.numero_minute, l.numero_dossier || null, l.nature_acte || null, l.conservation_fonciere || null,
           l.progression, l.responsable || null, l.honoraires_totaux, l.montant_regle, l.date_ouverture]);
        await c.query(
          `INSERT INTO acte_parties (etude_id, acte_id, ordre, nom_partie)
           VALUES (current_setting('app.current_etude_id')::uuid, $1, 1, $2)`, [acte.id, l.client]);
        n++;
      }
      await audit(c, { etudeId: s.etudeId, table: "actes", ligneId: null,
        action: "import_excel", apres: { importes: n }, utilisateur: s.uid });
      return n;
    });
    return NextResponse.json({ ok: true, importees: inserees, ignorees: valides.length - inserees });
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
