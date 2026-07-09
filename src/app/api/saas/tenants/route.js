import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { exigerSuperAdmin } from "@/lib/auth";
import { query, withTenant, newId } from "@/lib/db";
import { isPg } from "@/lib/dialect";
import { REFERENTIELS_DEFAUT } from "@/lib/referentiels-defaut";

export async function GET() {
  try {
    await exigerSuperAdmin();
    const { rows } = await query(
      `SELECT t.*, e.nom AS etude_nom, e.statut AS etude_statut
       FROM saas_tenants t
       LEFT JOIN etudes e ON e.id = t.etude_id
       ORDER BY t.cree_le DESC`
    );
    return NextResponse.json(rows);
  } catch (e) { return NextResponse.json({ erreur: e.message }, { status: e.status || 500 }); }
}

function genererMotDePasse() {
  const lettres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const chiffres = "23456789";
  const tout = lettres + chiffres;
  const pick = (jeu) => jeu[crypto.randomInt(jeu.length)];
  let mdp = pick(lettres) + pick(chiffres);
  for (let i = 0; i < 8; i++) mdp += pick(tout);
  return mdp.split("").sort(() => crypto.randomInt(3) - 1).join("");
}

/** Provisionnement complet d'une nouvelle étude (cabinet) : étude + compte Notaire admin + référentiels. */
export async function POST(req) {
  try {
    const s = await exigerSuperAdmin();
    const d = await req.json();
    if (!d.nom_etude?.trim())
      return NextResponse.json({ erreur: "Le nom de l'étude est requis." }, { status: 400 });
    if (!d.identifiant_notaire?.trim())
      return NextResponse.json({ erreur: "L'identifiant de connexion du Notaire est requis." }, { status: 400 });
    if (!/^[a-z0-9._-]{3,30}$/.test(d.identifiant_notaire))
      return NextResponse.json({ erreur: "Identifiant : 3 à 30 caractères, minuscules, chiffres, . _ - uniquement." }, { status: 400 });
    if (!d.nom_affiche_notaire?.trim())
      return NextResponse.json({ erreur: "Le nom affiché du Notaire est requis." }, { status: 400 });

    const motDePasseProvisoire = d.motDePasseProvisoire?.trim() || genererMotDePasse();
    if (motDePasseProvisoire.length < 8)
      return NextResponse.json({ erreur: "Mot de passe provisoire : au moins 8 caractères." }, { status: 400 });
    const hash = await bcrypt.hash(motDePasseProvisoire, 10);

    const etudeId = newId();
    const tenantId = newId();
    const userId = newId();

    const resultat = await withTenant(etudeId, async (c) => {
      await c.query(
        `INSERT INTO etudes (id, nom, adresse, email_gmail_notaire, email_gmail_partage, statut)
         VALUES ($1,$2,$3,$4,$5,'active')`,
        [etudeId, d.nom_etude.trim(), d.adresse || null, d.email_notaire || null, d.email_partage || d.email_notaire || null]
      );

      const niveauCol = isPg() ? "true" : "1";
      await c.query(
        `INSERT INTO utilisateurs
           (id, etude_id, role, identifiant, nom_affiche, nom_complet, fonction, email_rattachement,
            hash_mot_de_passe, doit_changer_mdp, actif, niveau_acces)
         VALUES ($1,$2,'admin_etude',$3,$4,$5,'Notaire principal',$6,$7,${niveauCol},${niveauCol},'administrateur')`,
        [userId, etudeId, d.identifiant_notaire.trim(), d.nom_affiche_notaire.trim(),
         d.nom_complet_notaire || null, d.email_notaire || null, hash]
      );

      for (const r of REFERENTIELS_DEFAUT) {
        await c.query(
          isPg()
            ? `INSERT INTO referentiels (etude_id, type_liste, valeur, ordre) VALUES ($1,$2,$3,$4)`
            : `INSERT INTO referentiels (id, etude_id, type_liste, valeur, ordre) VALUES ($1,$2,$3,$4,$5)`,
          isPg() ? [etudeId, r.type_liste, r.valeur, r.ordre] : [newId(), etudeId, r.type_liste, r.valeur, r.ordre]
        );
      }

      await c.query(
        isPg()
          ? `INSERT INTO parametres_etude (etude_id) VALUES ($1) ON CONFLICT DO NOTHING`
          : `INSERT OR IGNORE INTO parametres_etude (etude_id) VALUES ($1)`,
        [etudeId]
      );

      const nomTenant = d.nom_tenant?.trim() || d.nom_etude.trim();
      await c.query(
        isPg()
          ? `INSERT INTO saas_tenants (id, etude_id, nom_tenant, contact_nom, contact_email, statut)
             VALUES ($1,$2,$3,$4,$5,'actif')`
          : `INSERT INTO saas_tenants (id, etude_id, nom_tenant, contact_nom, contact_email, statut)
             VALUES ($1,$2,$3,$4,$5,'actif')`,
        [tenantId, etudeId, nomTenant, d.contact_nom || d.nom_affiche_notaire.trim(), d.contact_email || d.email_notaire || null]
      );

      if (d.plan_id) {
        const planRows = (await c.query(`SELECT * FROM saas_plans WHERE id = $1`, [d.plan_id])).rows;
        const plan = planRows[0];
        if (plan) {
          const subId = newId();
          await c.query(
            `INSERT INTO saas_subscriptions (id, tenant_id, plan_id, periodicite, statut, montant)
             VALUES ($1,$2,$3,'mensuel','active',$4)`,
            [subId, tenantId, plan.id, plan.prix_mensuel]
          );
        }
      }

      return { etudeId, tenantId, userId };
    });

    return NextResponse.json({
      etude: { id: resultat.etudeId, nom: d.nom_etude.trim() },
      tenant: { id: resultat.tenantId },
      identifiant: d.identifiant_notaire.trim(),
      motDePasseProvisoire,
    }, { status: 201 });
  } catch (e) {
    if (e.code === "23505")
      return NextResponse.json({ erreur: "Cet identifiant est déjà utilisé sur la plateforme. Choisissez-en un autre." }, { status: 409 });
    return NextResponse.json({ erreur: e.message }, { status: e.status || 500 });
  }
}
