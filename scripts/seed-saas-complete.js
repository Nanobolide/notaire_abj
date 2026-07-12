const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const DEFAULT_PASSWORD = "ChangezMoi2026!";
const HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const ETUDES = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "kouassi",
    nom: "Étude de Me KOUASSI MARLENE K. ELISEE",
    adresse: "Abidjan, Côte d'Ivoire",
    emailNotaire: "notaire.kouassi@gmail.com",
    emailPartage: "etude.kouassi@gmail.com",
    contactNom: "Me Kouassi Marlène",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "konan",
    nom: "Étude de Me KONAN N'DA Arlette",
    adresse: "Cocody Angre, Abidjan",
    emailNotaire: "notaire.konan@gmail.com",
    emailPartage: "etude.konan@gmail.com",
    contactNom: "Me Konan N'Da",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "yao",
    nom: "Étude de Me YAO Koffi Julien",
    adresse: "Plateau, Abidjan",
    emailNotaire: "notaire.yao@gmail.com",
    emailPartage: "etude.yao@gmail.com",
    contactNom: "Me Yao Koffi",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    slug: "traore",
    nom: "Étude de Me TRAORE Aminata",
    adresse: "Bouake, Côte d'Ivoire",
    emailNotaire: "notaire.traore@gmail.com",
    emailPartage: "etude.traore@gmail.com",
    contactNom: "Me Traore Aminata",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    slug: "soro",
    nom: "Étude de Me SORO Mory",
    adresse: "Yamoussoukro, Côte d'Ivoire",
    emailNotaire: "notaire.soro@gmail.com",
    emailPartage: "etude.soro@gmail.com",
    contactNom: "Me Soro Mory",
  },
];

const USERS_BY_ETUDE = (etude) => ([
  {
    id: `${etude.id.slice(0, 8)}-aaaa-1111-1111-111111111111`,
    role: "admin_etude",
    identifiant: `${etude.slug}.notaire`,
    nom_affiche: `Notaire (${etude.slug})`,
    nom_complet: etude.contactNom,
    fonction: "Notaire principal",
    email: etude.emailNotaire,
    niveau: "administrateur",
  },
  {
    id: `${etude.id.slice(0, 8)}-bbbb-2222-2222-222222222222`,
    role: "collaborateur",
    identifiant: `${etude.slug}.secretariat`,
    nom_affiche: `Secrétariat (${etude.slug})`,
    nom_complet: `Secrétariat ${etude.slug}`,
    fonction: "Secrétariat",
    email: etude.emailPartage,
    niveau: "standard",
  },
  {
    id: `${etude.id.slice(0, 8)}-cccc-3333-3333-333333333333`,
    role: "collaborateur",
    identifiant: `${etude.slug}.clerc1`,
    nom_affiche: `Clerc 1 (${etude.slug})`,
    nom_complet: `Clerc 1 ${etude.slug}`,
    fonction: "Clerc de 1ère catégorie",
    email: etude.emailPartage,
    niveau: "standard",
  },
  {
    id: `${etude.id.slice(0, 8)}-dddd-4444-4444-444444444444`,
    role: "collaborateur",
    identifiant: `${etude.slug}.comptable`,
    nom_affiche: `Comptable (${etude.slug})`,
    nom_complet: `Comptable ${etude.slug}`,
    fonction: "Comptable",
    email: etude.emailPartage,
    niveau: "comptable",
  },
]);

const PLANS = [
  { id: "90000000-0000-0000-0000-000000000001", code: "STARTER", nom: "Starter", mensuel: 45000, annuel: 486000, maxUsers: 5, maxStorage: 20 },
  { id: "90000000-0000-0000-0000-000000000002", code: "PRO", nom: "Pro", mensuel: 85000, annuel: 918000, maxUsers: 20, maxStorage: 80 },
  { id: "90000000-0000-0000-0000-000000000003", code: "ENTERPRISE", nom: "Enterprise", mensuel: 150000, annuel: 1620000, maxUsers: 100, maxStorage: 300 },
];

async function ensurePlan(queryFn, isPg, plan) {
  if (isPg) {
    await queryFn(
      `INSERT INTO saas_plans (id, code, nom, prix_mensuel, prix_annuel, max_utilisateurs, max_stockage_go, actif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, prix_mensuel = EXCLUDED.prix_mensuel,
         prix_annuel = EXCLUDED.prix_annuel, max_utilisateurs = EXCLUDED.max_utilisateurs, max_stockage_go = EXCLUDED.max_stockage_go`,
      [plan.id, plan.code, plan.nom, plan.mensuel, plan.annuel, plan.maxUsers, plan.maxStorage]
    );
  } else {
    await queryFn(
      `INSERT OR IGNORE INTO saas_plans (id, code, nom, prix_mensuel, prix_annuel, max_utilisateurs, max_stockage_go, actif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1)`,
      [plan.id, plan.code, plan.nom, plan.mensuel, plan.annuel, plan.maxUsers, plan.maxStorage]
    );
  }
}

async function seedSaasComplete(queryFn, isPg) {
  for (const plan of PLANS) await ensurePlan(queryFn, isPg, plan);

  for (const etude of ETUDES) {
    if (isPg) {
      await queryFn(
        `INSERT INTO etudes (id, nom, adresse, email_gmail_notaire, email_gmail_partage, statut)
         VALUES ($1,$2,$3,$4,$5,'active')
         ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, adresse = EXCLUDED.adresse,
           email_gmail_notaire = EXCLUDED.email_gmail_notaire, email_gmail_partage = EXCLUDED.email_gmail_partage`,
        [etude.id, etude.nom, etude.adresse, etude.emailNotaire, etude.emailPartage]
      );
    } else {
      await queryFn(
        `INSERT OR IGNORE INTO etudes (id, nom, adresse, email_gmail_notaire, email_gmail_partage, statut)
         VALUES ($1,$2,$3,$4,$5,'active')`,
        [etude.id, etude.nom, etude.adresse, etude.emailNotaire, etude.emailPartage]
      );
    }

    for (const user of USERS_BY_ETUDE(etude)) {
      if (isPg) {
        await queryFn(
          `INSERT INTO utilisateurs (id, etude_id, role, identifiant, nom_affiche, nom_complet, fonction, email_rattachement,
             hash_mot_de_passe, doit_changer_mdp, actif, niveau_acces)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true,$10)
           ON CONFLICT (identifiant) DO UPDATE SET
             nom_affiche = EXCLUDED.nom_affiche, nom_complet = EXCLUDED.nom_complet, fonction = EXCLUDED.fonction,
             email_rattachement = EXCLUDED.email_rattachement, niveau_acces = EXCLUDED.niveau_acces, etude_id = EXCLUDED.etude_id`,
          [user.id, etude.id, user.role, user.identifiant, user.nom_affiche, user.nom_complet, user.fonction, user.email, HASH, user.niveau]
        );
      } else {
        await queryFn(
          `INSERT INTO utilisateurs (id, etude_id, role, identifiant, nom_affiche, nom_complet, fonction, email_rattachement,
             hash_mot_de_passe, doit_changer_mdp, actif, niveau_acces)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,1,$10)
           ON CONFLICT (identifiant) DO UPDATE SET
             nom_affiche = excluded.nom_affiche, nom_complet = excluded.nom_complet, fonction = excluded.fonction,
             email_rattachement = excluded.email_rattachement, niveau_acces = excluded.niveau_acces,
             hash_mot_de_passe = excluded.hash_mot_de_passe`,
          [randomUUID(), etude.id, user.role, user.identifiant, user.nom_affiche, user.nom_complet, user.fonction, user.email, HASH, user.niveau]
        );
      }
    }

    const notaire = `${etude.slug}.notaire`;
    const notaireRow = await queryFn(`SELECT id FROM utilisateurs WHERE identifiant = $1`, [notaire]);
    const notaireId = notaireRow.rows[0]?.id || null;

    if (isPg) {
      await queryFn(
        `INSERT INTO parametres_etude (etude_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [etude.id]
      );
    } else {
      await queryFn(`INSERT OR IGNORE INTO parametres_etude (etude_id) VALUES ($1)`, [etude.id]);
    }

    const tenantId = isPg ? `${etude.id.slice(0, 8)}-eeee-5555-5555-555555555555` : randomUUID();
    const subscriptionId = isPg ? `${etude.id.slice(0, 8)}-ffff-6666-6666-666666666666` : randomUUID();
    const licenseId = isPg ? `${etude.id.slice(0, 8)}-9999-7777-7777-777777777777` : randomUUID();
    const invoiceId = isPg ? `${etude.id.slice(0, 8)}-8888-8888-8888-888888888888` : randomUUID();
    const plan = etude.slug === "kouassi" ? PLANS[2] : PLANS[1];
    const reference = `INV-${etude.slug.toUpperCase()}-2026-001`;

    if (isPg) {
      await queryFn(
        `INSERT INTO saas_tenants (id, etude_id, nom_tenant, contact_nom, contact_email, statut)
         VALUES ($1,$2,$3,$4,$5,'actif')
         ON CONFLICT (etude_id) DO UPDATE SET nom_tenant = EXCLUDED.nom_tenant, contact_nom = EXCLUDED.contact_nom, contact_email = EXCLUDED.contact_email`,
        [tenantId, etude.id, etude.nom, etude.contactNom, etude.emailNotaire]
      );
    } else {
      await queryFn(
        `INSERT OR IGNORE INTO saas_tenants (id, etude_id, nom_tenant, contact_nom, contact_email, statut)
         VALUES ($1,$2,$3,$4,$5,'actif')`,
        [tenantId, etude.id, etude.nom, etude.contactNom, etude.emailNotaire]
      );
    }

    const tenantRow = await queryFn(`SELECT id FROM saas_tenants WHERE etude_id = $1`, [etude.id]);
    const tid = tenantRow.rows[0]?.id;
    if (!tid) continue;

    if (isPg) {
      await queryFn(
        `INSERT INTO saas_subscriptions (id, tenant_id, plan_id, periodicite, statut, montant)
         VALUES ($1,$2,$3,'mensuel','active',$4)
         ON CONFLICT (id) DO NOTHING`,
        [subscriptionId, tid, plan.id, plan.mensuel]
      );
      await queryFn(
        `INSERT INTO saas_licenses (id, tenant_id, cle_licence, quota_utilisateurs, quota_stockage_go, statut)
         VALUES ($1,$2,$3,$4,$5,'active')
         ON CONFLICT (cle_licence) DO NOTHING`,
        [licenseId, tid, `LIC-${etude.slug.toUpperCase()}-2026`, plan.maxUsers, plan.maxStorage]
      );
      await queryFn(
        `INSERT INTO saas_invoices (id, tenant_id, subscription_id, reference, montant, devise, statut, echeance_le)
         VALUES ($1,$2,$3,$4,$5,'XOF','en_attente', CURRENT_DATE + 15)
         ON CONFLICT (reference) DO NOTHING`,
        [invoiceId, tid, subscriptionId, reference, plan.mensuel]
      );
      await queryFn(
        `INSERT INTO saas_support_tickets (id, tenant_id, sujet, description, priorite, statut, cree_par, assigne_a)
         VALUES ($1,$2,$3,$4,'normale','ouvert',$5,$5)
         ON CONFLICT (id) DO NOTHING`,
        [`${etude.id.slice(0, 8)}-7777-9999-9999-999999999999`, tid, `Onboarding ${etude.slug}`, "Validation environnement de recette PO", notaireId]
      );
      await queryFn(
        `INSERT INTO saas_notifications (id, tenant_id, canal, cible, sujet, message, statut)
         VALUES ($1,$2,'email',$3,$4,$5,'sent')
         ON CONFLICT (id) DO NOTHING`,
        [`${etude.id.slice(0, 8)}-6666-aaaa-aaaa-aaaaaaaaaaaa`, tid, etude.emailNotaire, "Bienvenue sur NOTARIA SaaS", "Votre espace de test est prêt."]
      );
    } else {
      await queryFn(
        `INSERT OR IGNORE INTO saas_subscriptions (id, tenant_id, plan_id, periodicite, statut, montant)
         VALUES ($1,$2,$3,'mensuel','active',$4)`,
        [subscriptionId, tid, plan.id, plan.mensuel]
      );
      await queryFn(
        `INSERT OR IGNORE INTO saas_licenses (id, tenant_id, cle_licence, quota_utilisateurs, quota_stockage_go, statut)
         VALUES ($1,$2,$3,$4,$5,'active')`,
        [licenseId, tid, `LIC-${etude.slug.toUpperCase()}-2026`, plan.maxUsers, plan.maxStorage]
      );
      await queryFn(
        `INSERT OR IGNORE INTO saas_invoices (id, tenant_id, subscription_id, reference, montant, devise, statut, echeance_le)
         VALUES ($1,$2,$3,$4,$5,'XOF','en_attente', date('now', '+15 days'))`,
        [invoiceId, tid, subscriptionId, reference, plan.mensuel]
      );
    }

    const acteId = isPg ? `${etude.id.slice(0, 8)}-1212-1212-1212-121212121212` : randomUUID();
    const appelId = isPg ? `${etude.id.slice(0, 8)}-3434-3434-3434-343434343434` : randomUUID();
    if (isPg) {
      await queryFn(
        `INSERT INTO actes (id, etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance, nature_acte, complexite,
           responsable, conservation_fonciere, progression, valeur_acte, honoraires_totaux, montant_regle, statut_paiement, saisi_par)
         VALUES ($1,$2,$3,$4,CURRENT_DATE - 2,CURRENT_DATE + 18,'Vente immobilière','Complexe','Le Notaire','COCODY','Rédaction',85000000,1750000,500000,'Partiel',$5)
         ON CONFLICT (id) DO NOTHING`,
        [acteId, etude.id, `2026/${etude.id.slice(0, 4)}`, `DOSS-${etude.slug.toUpperCase()}-001`, notaireId]
      );
      await queryFn(
        `INSERT INTO appels_courriers (id, etude_id, numero, annee, type_flux, date_entree, heure, client_nom, destinataire, motif, statut_traitement, nb_tentatives, saisi_par)
         VALUES ($1,$2,1,2026,'Appel Téléphonique',CURRENT_DATE,LOCALTIME,$3,'Le Notaire','Nouvelle demande','En cours',1,$4)
         ON CONFLICT (id) DO NOTHING`,
        [appelId, etude.id, `Client Test ${etude.slug.toUpperCase()}`, notaireId]
      );
    } else {
      await queryFn(
        `INSERT OR IGNORE INTO actes (id, etude_id, numero_minute, numero_dossier, date_ouverture, date_echeance, nature_acte, complexite,
           responsable, conservation_fonciere, progression, valeur_acte, honoraires_totaux, montant_regle, statut_paiement, saisi_par)
         VALUES ($1,$2,$3,$4,date('now','-2 days'),date('now','+18 days'),'Vente immobilière','Complexe','Le Notaire','COCODY','Rédaction',85000000,1750000,500000,'Partiel',$5)`,
        [acteId, etude.id, `2026/${etude.id.slice(0, 4)}`, `DOSS-${etude.slug.toUpperCase()}-001`, notaireId]
      );
      await queryFn(
        `INSERT OR IGNORE INTO appels_courriers (id, etude_id, numero, annee, type_flux, date_entree, heure, client_nom, destinataire, motif, statut_traitement, nb_tentatives, saisi_par)
         VALUES ($1,$2,1,2026,'Appel Téléphonique',date('now'),time('now'),$3,'Le Notaire','Nouvelle demande','En cours',1,$4)`,
        [appelId, etude.id, `Client Test ${etude.slug.toUpperCase()}`, notaireId]
      );
    }
  }

  const superAdminId = isPg
    ? "a0000005-1111-1111-1111-111111111111"
    : "u0000005-1111-1111-1111-111111111111";
  const settingsValue = JSON.stringify({
    onboarding: true,
    environment: "demo-po",
    tenants_count: ETUDES.length,
    default_password: DEFAULT_PASSWORD,
  });
  if (isPg) {
    await queryFn(
      `INSERT INTO saas_global_settings (cle, valeur, modifie_par)
       VALUES ($1,$2::jsonb,$3)
       ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, modifie_par = EXCLUDED.modifie_par, modifie_le = now()`,
      ["platform.demo", settingsValue, superAdminId]
    );
  } else {
    await queryFn(
      `INSERT OR REPLACE INTO saas_global_settings (cle, valeur, modifie_par, modifie_le)
       VALUES ($1,$2,$3,datetime('now'))`,
      ["platform.demo", settingsValue, superAdminId]
    );
  }

  console.log(`→ Seed SaaS complet prêt (${ETUDES.length} études, identifiant notaire: *.notaire, mot de passe: ${DEFAULT_PASSWORD}).`);
}

module.exports = { seedSaasComplete, DEFAULT_PASSWORD, ETUDES };
