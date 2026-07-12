# NOTARIA — Liste de travaux avant mise en production réelle

> Contexte : l'application est déployée en test sur https://notaci.brindoujunior.com
> (serveur PM2 + Nginx + PostgreSQL local, base `notaria`). L'audit du 2026-07-12 a
> révélé que l'isolation multi-tenant ne reposait PAS sur la base de données dans le
> déploiement réel : `db/schema.pg.sql` (exécuté par `scripts/migrate.js`) ne contenait
> aucune policy RLS, contrairement à `db/schema.sql` qui les définit mais n'était jamais
> exécuté. Chaque section ci-dessous a un critère d'acceptation vérifiable.
>
> **Mise à jour 2026-07-12 (branche `brindou`)** : P0, P1, P3 complets, P2 quasi complet
> — tout vérifié en conditions réelles sur le serveur de test (login, isolation croisée,
> console Super Admin, récupération de mot de passe, cookie forgé, session glissante,
> migrations rejouées, sauvegarde restaurable). Seul reste : le découpage LOURD des
> pages (#13 — composant Registre/Tableau, modales, hook de fetch commun), volontairement
> laissé pour une repasse avec vérification visuelle dans un navigateur (indisponible
> dans cet environnement CLI) plutôt qu'en aveugle. La partie mécanique et sans risque
> (Pagination/Erreur) est faite. Voir l'historique de la branche pour le détail
> commit par commit.

---

## P0 — Sécurité critique (bloquant avant toute donnée client réelle)

### 1. Porter la Row-Level Security dans le chemin de déploiement réel — ✅ FAIT
- RLS (`ENABLE`/`FORCE ROW LEVEL SECURITY` + policies `isolation_*`) portée dans
  `db/schema.pg.sql`, étendue aux tables ajoutées depuis `schema.sql` (mfa,
  security_events, saas_*) qui restent volontairement HORS RLS (données plateforme
  transverses). `etudes` reste hors RLS aussi (console Super Admin cross-étude) mais
  ses grants sont complétés (SELECT+INSERT+UPDATE, pas seulement SELECT).
- **Écart au plan initial** : le rôle `notaria_app` n'est PAS créé automatiquement par
  la migration (ça exigerait de donner CREATEROLE au rôle qui migre — refusé comme
  escalade de privilège non demandée). Bootstrap **manuel, une fois par base**, par un
  DBA — procédure documentée en commentaire dans `db/schema.pg.sql` juste avant le
  bloc RLS. La migration vérifie la présence du rôle et échoue explicitement sinon.
- **Acceptation vérifiée** : `notaria_app` sans `set_config` → 0 ligne sur `utilisateurs`
  (testé) ; login + registre des actes + console Super Admin (5 études visibles) tous
  fonctionnels avec le rôle restreint ; `notaria_user` (propriétaire) a BYPASSRLS.

### 2. Adapter les routes cross-tenant à la RLS — ✅ FAIT (analyse + 1 fix)
- Audit complet de toutes les routes API : les routes `saas/*` ne touchent QUE des
  tables hors-RLS (saas_*, etudes) — aucun changement de code nécessaire là.
- Seul vrai gap trouvé : `/api/recuperation` (mot de passe oublié) faisait un lookup
  cross-étude direct sur `utilisateurs` (bloqué par la RLS, comme `auth_lookup` pour
  la connexion). Ajout de `demande_recuperation_creer()`, fonction SECURITY DEFINER
  dédiée. Testé bout en bout (insertion vérifiée en base).

### 3. Faire passer réellement les 3 tests de sécurité — ✅ FAIT
- `npm run test:isolation`, `test:authz`, `test:security:smoke` passent tous les 3
  avec `DATABASE_URL`=notaria_app + `ADMIN_DATABASE_URL`=notaria_user.
- **Reste à faire (hors serveur, action GitHub)** : renseigner le secret
  `DATABASE_URL` (+ `ADMIN_DATABASE_URL`, à ajouter au workflow) dans
  `.github/workflows/ci-gates.yml` côté réglages du repo GitHub — non automatisable
  depuis ce serveur (pas de `gh` CLI, et modifier des secrets d'un repo GitHub est
  hors du périmètre infra local).

### 4. Committer le correctif `db/seed.pg.sql` — ✅ FAIT

### 5. Neutraliser le seed de démonstration en production — ✅ FAIT
- Chargement conditionné à `SEED_DEMO=1` explicite (jamais par défaut, y compris
  `NODE_ENV=production`). `render.yaml` mis à jour pour l'activer explicitement
  (son usage — « test à distance » — en a besoin par design).

### 6. Vérifier la signature du JWT dans le middleware — ✅ FAIT
- `jose` (`jwtVerify`, compatible Edge) remplace le décodage `atob()` sans
  vérification. Testé : un cookie forgé (payload `role:"super_admin"` sans bonne
  signature) est maintenant rejeté et redirigé vers `/connexion` (avant : affichait
  le shell `/admin`).

### 7. Mettre à jour les dépendances vulnérables restantes — PARTIEL
- Fait : `next` 14.2.5 → **14.2.35** (faille critique cache poisoning corrigée).
- Non fait (délibérément, saut de version majeure trop risqué pour un correctif
  automatisé) : passage à Next 15/16 pour le reste (1 high + 3 moderate résiduels,
  DoS image optimizer / postcss / uuid via exceljs). À planifier avec recette dédiée.

---

## P1 — Fiabilité / robustesse

### 8. Supprimer les fallbacks silencieux — ✅ FAIT
- `instrumentation.js` + `instrumentation-node.js` : self-check au démarrage
  (fonctions SECURITY DEFINER présentes ? RLS forcée ? rôle sans BYPASSRLS ?),
  logué clairement. Testé : log `✅ [self-check RLS/sécurité] ...` au boot.
- `src/lib/db.js` : nouvelle fonction `signalerFallback()`, appelée dans chaque
  bloc catch qui retombait silencieusement (etatCompte, verifierCompteActif,
  deconnecterPresence, purgerCorbeilleExpiree, auth_lookup, auth_apres_tentative) —
  logue une fois par process, pas en boucle.

### 9. Migrations versionnées — ✅ FAIT
- `db/migrations/0001-0004` (numérotés, rejoués une seule fois chacun) + table
  `schema_migrations` (filename UNIQUE) suivant l'état appliqué. `schema.pg.sql`,
  `seed.pg.sql`, `schema.sql`, `seed.sql`, `demo.sql`, `demo_reset.sql` supprimés
  (contenu repris dans les migrations, ou orphelins jamais exécutés). Testé sur le
  serveur : 4 migrations appliquées au premier passage, second passage sans
  ré-exécution, les 3 tests de sécurité repassent au vert après coup.

### 10. Corriger l'avertissement de module au seed — ✅ FAIT
- `demo-data.js` → `demo-data.mjs`. Vérifié : plus d'avertissement
  `MODULE_TYPELESS_PACKAGE_JSON`, build Next.js et script de migration OK.

### 11. Rate-limiting : documenter la limite — ✅ FAIT (documentation seule)
- Limite en mémoire process documentée en commentaire (perte au restart, pas de
  coordination multi-instance, pas de purge des clés expirées). Redis non branché
  (pas nécessaire tant que le déploiement reste mono-instance).

### 12. Session glissante — ✅ FAIT
- Rafraîchissement du cookie si plus de la moitié de la fenêtre (30 min) est
  écoulée, plafonné à 4h depuis la connexion initiale (claim `sessionDebut`, jamais
  modifié par les rafraîchissements). Testé avec un token forgé proche de
  l'expiration (rafraîchi, `sessionDebut` préservé) et un token au-delà du plafond
  (non rafraîchi).

---

## P2 — Qualité de code / maintenabilité

### 13. Découper les pages monolithiques — PARTIEL
- ✅ Fait (mécanique, zéro changement de comportement, vérifié build+SSR 200 sur les
  3 pages) : `src/components/Pagination.js` et `src/components/Erreur.js` extraits,
  utilisés par `actes`/`appels`/`comptes` (comptes n'a pas de pagination serveur).
- ⏳ Reste à faire : le vrai découpage lourd (composant Registre/Tableau, modales,
  hook de fetch commun) sur `actes/page.js` (toujours ~450 lignes), `appels` (~250),
  `comptes` (~280). Volontairement NON fait dans cette passe : aucun outil de
  vérification visuelle dans un navigateur n'était disponible dans cet
  environnement CLI, et ce refactor-là est trop risqué pour être fait "à l'aveugle"
  (formulaires + tableaux + modales, pas du JSX strictement dupliqué comme
  Pagination/Erreur). À faire par quelqu'un avec accès navigateur, en testant
  chaque page manuellement après extraction.

### 14. Trancher le sort du squelette DDD `src/modules/` — ✅ FAIT
- Supprimé (5 fichiers README/contexts.md, zéro code, rien ne les référençait).

### 15. Tests unitaires métier — ✅ FAIT
- `tests/regles-metier.js` (17 cas, `node --test`, zéro dépendance) :
  `plafondReglement`, `estVentile`, `filtrerActe` (Accueil/Notaire/Formaliste),
  `echeanceParDefaut` (nouvellement extrait de la route vers `src/lib/regles.js`),
  `joursEcoules`, `seuilsActe`, `respectEcheance`, `totalFacture`, `resteAPayer`.
  Ajouté au job CI. Vérifié en conditions réelles (création d'un acte sans
  échéance → bonne date en base).
- Non fait : détection de doublon 5 min (dépend du temps SQL en conditions
  réelles, pas extrait en fonction pure — nécessiterait un vrai test
  d'intégration avec base, hors périmètre "unitaire").

### 16. Nettoyages divers — ✅ FAIT
- `src/lib/db.js` : `TenantResolver`/`ConnectionManager` supprimés (exports morts,
  rien ne les important) ; les fonctions internes (`poolForTenant` etc.) restent,
  toujours utilisées par `withTenant`.
- `render.yaml` : gardé (décision de le supprimer pas de mon ressort), mais
  corrigé et documenté (`SEED_DEMO=1`, note BYPASSRLS pour son rôle unique).
- README : sections sécurité/RLS/SEED_DEMO mises à jour pour refléter l'état réel.

---

## P3 — Infra / exploitation (serveur de prod cible)

### 17. Sauvegardes quotidiennes de la base — ✅ FAIT
- `notaria` ajoutée à `/var/www/backup/scripts/backup_hostdbs.sh` (mécanisme
  existant, déjà utilisé pour 3 autres bases sans script dédié : dump atomique,
  rotation 7 jours, sync Google Drive via l'orchestrateur déjà en cron à 2h30).
  Testé manuellement : dump valide (22 tables, `gunzip -t` OK). Hors dépôt git
  (scripts serveur partagés, pas versionnés).

### 18. Monitoring (sonde `/api/health`) — ✅ FAIT
- `scripts/healthcheck.sh` (dans le dépôt) : vérifie réellement l'app + la base
  (pas juste le statut PM2 "online"), silencieux si OK, logue sinon. Câblé en
  cron toutes les 5 min sur le serveur (`/var/log/noraci-healthcheck.log`).
  Uptime Kuma tourne déjà sur ce serveur pour d'autres apps — ajouter
  `https://notaci.brindoujunior.com/api/health` comme moniteur via son interface
  web reste une option pour un tableau de bord plus visuel (non fait : modifier
  sa base SQLite pendant qu'il tourne aurait été risqué, à faire via l'UI).

### 19. Logrotate PM2 — ✅ FAIT
- `/etc/logrotate.d/noraci` (hors dépôt) : `logs/*.log` de l'app (14 jours) +
  `/var/log/noraci-healthcheck.log` (8 semaines), `copytruncate` (PM2 garde le
  fichier ouvert, pas de signal de rechargement nécessaire). Validé par
  `logrotate -d`.

### 20. `.env.example` — ✅ FAIT (ADMIN_DATABASE_URL, SEED_DEMO, JWT_SECRETS_JSON, PORT documentés)

---

## Périmètre fonctionnel restant (hors dette — cf. README)
- Connexion Google OAuth du Notaire (NextAuth) — prévu, non commencé.
- Onboarding Super-Admin (création d'une étude sans passer par le seed).
- Purge décennale automatisée.
- Tests de charge avant ouverture au-delà de l'étude pilote.
