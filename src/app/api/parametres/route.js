import { NextResponse } from "next/server";
import { exigerSession, exigerAdmin } from "@/lib/auth";
import { modifieTva, gereParametres } from "@/lib/acces";
import { withTenant, audit } from "@/lib/db";

const DEFAUTS = {
  conservation_annees: 10, session_minutes: 30,
  acte_simple_s1: 20, acte_simple_s2: 40, acte_simple_s3: 60,
  acte_complexe_s1: 30, acte_complexe_s2: 60, acte_complexe_s3: 90,
  succession_s1: 180, succession_s2: 270, succession_s3: 365,
  appel_s1: 3, appel_s2: 5, appel_s3: 10,
  couleur_n1: "#FFF4C2", couleur_n2: "#FFD9A0", couleur_n3: "#FF9E9E", couleur_ok: "#E9F7EC",
};

async function lire(c, etudeId) {
  let { rows } = await c.query(`SELECT * FROM parametres_etude WHERE etude_id = $1`, [etudeId]);
  if (!rows[0]) {
    await c.query(`INSERT INTO parametres_etude (etude_id) VALUES ($1) ON CONFLICT DO NOTHING`, [etudeId]);
    rows = (await c.query(`SELECT * FROM parametres_etude WHERE etude_id = $1`, [etudeId])).rows;
  }
  return rows[0];
}

/** Lecture des paramètres — accessible à toute session (l'app en a besoin pour les couleurs). */
export async function GET() {
  try {
    const s = await exigerSession();
    const p = await withTenant(s.etudeId, (c) => lire(c, s.etudeId));
    return NextResponse.json(p);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

/** Mise à jour (Notaire). Envoyer {reinitialiser:true} pour rétablir les valeurs par défaut. */
export async function PATCH(req) {
  try {
    // C13 — deux droits distincts : le taux de TVA (Notaire + Comptable) et le reste (Administrateur).
    const s = await exigerSession();
    const d = await req.json();
    const champsDemandes = Object.keys(d).filter((k) => k !== "reinitialiser");
    const tvaSeule = champsDemandes.length > 0 && champsDemandes.every((k) => k === "taux_tva");
    if (tvaSeule) {
      if (!modifieTva(s))
        return NextResponse.json({ erreur: "Seuls le Notaire et le Comptable peuvent modifier le taux de TVA." }, { status: 403 });
    } else if (!gereParametres(s)) {
      return NextResponse.json({ erreur: "Réservé à l'Administrateur de l'étude." }, { status: 403 });
    }
    const source = d.reinitialiser ? DEFAUTS : d;
    // Validation : seuils strictement croissants et positifs
    const groupes = [["acte_simple_s1","acte_simple_s2","acte_simple_s3"],
                     ["acte_complexe_s1","acte_complexe_s2","acte_complexe_s3"],
                     ["succession_s1","succession_s2","succession_s3"],
                     ["appel_s1","appel_s2","appel_s3"]];
    for (const [a, b, cc] of groupes) {
      if ([a,b,cc].some((k) => source[k] !== undefined)) {
        const v1 = Number(source[a]), v2 = Number(source[b]), v3 = Number(source[cc]);
        if (!(v1 > 0 && v1 < v2 && v2 < v3))
          return NextResponse.json({ erreur: `Les seuils doivent être croissants et positifs (${a} < ${b} < ${cc}).` }, { status: 400 });
      }
    }
    if (source.conservation_annees !== undefined &&
        (source.conservation_annees < 1 || source.conservation_annees > 10))
      return NextResponse.json({ erreur: "La conservation doit être comprise entre 1 et 10 ans." }, { status: 400 });

    for (const k of ["couleur_n1","couleur_n2","couleur_n3","couleur_ok"]) {
      if (source[k] !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(source[k]))
        return NextResponse.json({ erreur: "Couleur invalide (format attendu : #RRGGBB)." }, { status: 400 });
    }
    const champs = Object.keys(DEFAUTS).filter((k) => source[k] !== undefined);
    const p = await withTenant(s.etudeId, async (c) => {
      await lire(c, s.etudeId); // garantit l'existence de la ligne
      if (champs.length) {
        const sets = champs.map((k, i) => `${k} = $${i + 2}`).join(", ");
        await c.query(`UPDATE parametres_etude SET ${sets}, maj_le = now() WHERE etude_id = $1`,
          [s.etudeId, ...champs.map((k) => source[k])]);
      }
      await audit(c, { etudeId: s.etudeId, table: "parametres_etude", action: "modification",
        apres: { reinitialiser: !!d.reinitialiser, champs }, utilisateur: s.uid });
      return lire(c, s.etudeId);
    });
    return NextResponse.json(p);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}
