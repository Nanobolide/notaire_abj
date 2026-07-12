# NOTARIA — Plateforme SaaS multi-études de gestion notariale (socle V2.2)

**V2.2 — ergonomie & présence** : menu du haut ÉPURÉ (Tableau de bord · Appels · Actes),
tout le reste regroupé dans un bouton « ⚙ Paramètres » à droite (Comptes, Corbeille, Délais &
barèmes, Changer mot de passe, Mentions légales, Se déconnecter). Indicateur de CONNEXION discret
sous le nom de l'étude (point vert + nom + rôle de la personne connectée). Carte « QUI EST CONNECTÉ »
sur le tableau de bord, réservée au Notaire (point vert = actif < 5 min, gris = hors ligne + depuis
quand). Volet « ⚙ RÉGLER LES DÉLAIS » directement dans le registre des actes : le Notaire ajuste un
barème et le tableau se recolore, synchronisé avec la page Paramètres. Déconnexion → hors ligne
immédiat. Non-régression vérifiée : isolation, C4/C6/C7/C8, présence.

**V2.1 — réglage rapide + couleurs personnalisables** :
• Bouton « ⚙ Régler les délais » directement dans le registre des actes : le Notaire ajuste
  les seuils (simples / complexes / successions) sans quitter la page, clique « Appliquer »,
  et le tableau se recolore aussitôt. C'est le MÊME paramètre que l'écran Paramètres (aucune
  duplication). • Le Notaire peut choisir les COULEURS des alertes (4 teintes : léger / moyen /
  grave / terminé) via des sélecteurs de couleur, avec aperçu en direct et validation #RRGGBB ;
  bouton « Rétablir les valeurs par défaut » inclus. • Les registres, le tableau de bord et les
  exports utilisent les couleurs de chaque étude. Non-régression : isolation, C4/C6/C7/C8.

**V2.0 — écran PARAMÈTRES du Notaire** : nouveau bouton « Paramètres » (admin) permettant de régler
soi-même, par étude : (1) la DURÉE DE CONSERVATION des données (1 à 10 ans) ; (2) la durée de
SESSION (15/30/60/120 min) ; (3) tous les BARÈMES DE DÉLAIS (actes simples, complexes, successions,
appels/courriers) — chaque seuil modifiable, avec validation « croissants et positifs » côté serveur
ET contraintes au niveau base. Bouton « ↺ Rétablir les valeurs par défaut » (barèmes recommandés).
Les couleurs des registres s'adaptent automatiquement aux barèmes de l'étude. Raccourci vers la
gestion des collaborateurs. Réservé au Notaire (un collaborateur reçoit 403).
Non-régression vérifiée : isolation multi-tenant (2 nouvelles tables sous RLS), C4/C6/C7/C8.

**V1.9 — robustesse et confort quotidien** :
• BROUILLON anti-coupure : le formulaire est sauvegardé dans le navigateur à chaque frappe ;
  après une coupure internet, une fermeture d'onglet ou une session expirée, la saisie est
  proposée à la restauration. • ALERTE anti-doublon : si un acte (même minute/nature) ou un
  appel (même client) vient d'être saisi, une confirmation « Enregistrer quand même ? » s'affiche.
• PAGINATION serveur (50 par page) sur les deux registres. • EXPORTS Excel par PLAGE DE DATES
  (du… au…, ou tout depuis le début). • PURGE DÉCENNALE : fonction recensant les actes de plus de
  10 ans à exporter avant archivage. • RÉCUPÉRATION du compte Notaire : lien « Mot de passe oublié »
  qui crée une demande traitée par le Super-Admin (équipe technique) après confirmation de vive voix.
Note hébergement : les SAUVEGARDES automatiques sont fournies par l'hébergeur (ex. Neon = sauvegardes
quotidiennes incluses) — à activer au déploiement, pas de code applicatif.
Non-régression vérifiée : isolation multi-tenant, C4/C6/C7/C8, nouvelles fonctions moteur.

**V1.8 — 3e audit (tolérance zéro) traité** :
C7 révocation IMMÉDIATE de session (un compte désactivé ou verrouillé perd l'accès à la
requête suivante, sans attendre les 30 min) · C8 verrouillage TEMPORAIRE et progressif
(15 min à 5 échecs, 1 h à 8) et l'admin d'étude n'est JAMAIS verrouillable (plus de déni de
service possible sur le Notaire) · I6 la corbeille purge réellement au-delà de 30 jours ·
N5 page « Mentions légales & protection des données (loi 2013-450) » liée au pied de page,
avec responsable de traitement, finalité, droits et champ de déclaration ARTCI ·
mot de passe provisoire masqué à la saisie. Non-régression vérifiée (isolation, C4, C6).

**V1.7** : C6 corrigée (identifiant de connexion UNIQUE sur toute la plateforme — le moteur
refuse les doublons inter-études) · écran **Corbeille** (Notaire) : consulter, restaurer en un
clic, supprimer définitivement, alerte sur les éléments à moins de 5 jours de la purge ·
**Exports Excel** des deux registres avec les couleurs des barèmes (boutons ⬇ Excel dans les
registres, montants réservés au Notaire, chaque export journalisé) · **vues d'impression**
🖨 Imprimer / PDF pour produire le registre à une inspection.
Liste de recette pour le développeur : (1) restaurer un acte supprimé depuis /corbeille,
(2) tenter de restaurer un doublon → message clair attendu, (3) télécharger /api/exports/actes
en notaire puis en collaborateur (colonnes financières absentes), (4) Ctrl+P sur /imprimer/actes.

**V1.6 — les 4 failles critiques de l'audit sont corrigées et testées** :
C1 blocage SERVEUR du mot de passe provisoire · C2 volet financier filtré sur TOUTES les
réponses (GET/POST/PATCH) · C3+I1+N3 écran « Comptes » du Notaire (créer, désactiver,
déverrouiller, réinitialiser) · C4 journaux audit/pièces inviolables au niveau du moteur
(REVOKE) · C5 unicité des numéros (minute et appels) avec gestion des collisions.
**Également** : modification complète et suppression (corbeille) ligne par ligne dans les
registres · parties multiples (+ Ajouter une partie) · 15 natures de dossier avec complexité
pré-sélectionnée (Succession verrouillée en Complexe) · responsables d'actes limités au
Notaire et aux Clercs · nom de l'étude affiché dans l'en-tête · garde-fous financiers ·
numéros de téléphone étrangers acceptés. IMPORTANT : recréer la base (schema.sql + seed.sql).

**Nouveautés V1.4** : changement de mot de passe OBLIGATOIRE à la première connexion ·
volet financier visible et modifiable par le Notaire (admin) uniquement, masqué côté serveur pour les collaborateurs ·
champ de recherche client dans les deux registres · échéance par défaut alignée sur les barèmes
(simple +20 j, complexe +30 j, succession +180 j) · note déontologique permanente en pied de page.

**Barèmes de délais V1.3** : actes simples 20/40/60 j · actes complexes 30/60/90 j · successions 180/270/365 j · appels et courriers 3/5/10 j (couleurs jaune → orange → rouge, vert pâle = terminé/résolu, violet = annulé).

Socle applicatif conforme au dossier de conception V1.0.
Étude pilote : **Me KOUASSI MARLENE K. ELISEE — Abidjan**.
Les registres démarrent **vides** : aucune donnée des fichiers Excel n'est migrée.

## Contenu du socle

| Périmètre | État |
|---|---|
| Schéma PostgreSQL multi-tenant + Row-Level Security **forcée** | ✅ Inclus (`db/schema.sql`) |
| Référentiels : 29 conservations foncières, motifs, statuts… | ✅ Inclus (`db/seed.sql`) |
| Connexion identifiant + mot de passe, verrouillage après 5 échecs, session 30 min | ✅ Inclus |
| Journal des Appels & Courriers : saisie hybride, SLA 72 h / 5 j, colorations V7 | ✅ Inclus |
| Suivi des Actes : échéance auto J+14, colorations V2, volet financier FCFA | ✅ Inclus |
| Journal historisé des pièces manquantes (append-only) | ✅ Inclus |
| Tableau de bord complet (modèle du classeur Excel V2.1) : compteurs gradués, suivi financier, analyse par Conservation Foncière, répartitions par étape / responsable / flux / motif / collaborateur | ✅ Inclus |
| Pages en deux onglets « Formulaire » / « Registre » (modèle Google Forms → Sheets) | ✅ Inclus |
| Colonne fusionnée ÉTAPE / STATUT (9 étapes + Terminé + Annulé) | ✅ Inclus |
| Journal d'audit (qui, quoi, quand, avant/après) | ✅ Inclus |
| Suppression logique réservée à l'Administrateur (corbeille) | ✅ Inclus (API) |
| Test automatisé d'isolation entre études | ✅ Inclus (`npm run test:isolation`) |
| Connexion Google OAuth du Notaire | ⬜ À brancher (NextAuth) — la connexion par identifiant fonctionne en attendant |
| Exports Excel/PDF, écran corbeille, gestion des comptes par le Notaire, purge décennale | ⬜ Étape suivante |

## Déploiement Render (PostgreSQL — test à distance)

Configuré via `render.yaml` (plan free) :

| Variable | Source |
|---|---|
| `DATABASE_URL` | PostgreSQL Render (lié automatiquement) |
| `JWT_SECRET` | Généré par Render |
| `NODE_ENV` | `production` |
| `SEED_DEMO` | `1` (charge les données de démo — jamais sur une base de vraies données) |

**Flux** : push sur `main` → build (`npm run build`) → démarrage (`npm start`) → migration PG (`prestart`).

- Sonde santé : `GET /api/health`
- URL : https://notaire-abj.onrender.com
- Connexion test : `notaire` / `ChangezMoi2026!` (comptes seed)

> Le premier chargement peut prendre 30–60 s (service free en veille).

## Installation locale (SQLite — 5 minutes)

1. **Prérequis** : Node.js 18+ (22 recommandé).
2. Copier la configuration :
   ```bash
   cp .env.example .env
   # Ne pas définir DATABASE_URL → SQLite automatique
   ```
3. Créer la base et lancer :
   ```bash
   npm install
   npm run dev          # migre + http://localhost:3000
   ```
## Données de démonstration (présentation client / PO)

En SQLite (dev local), chargées automatiquement à chaque migration, comme avant.

En PostgreSQL, **uniquement si `SEED_DEMO=1`** est défini (jamais par défaut,
y compris quand `NODE_ENV=production` — une base de vraies données ne doit
jamais recevoir ces comptes de démo à mot de passe connu) :
- si le marqueur `2026/0201` est absent, **30 actes** et **30 appels** fictifs
  (avril-juin 2026) sont chargés automatiquement pour l'étude pilote;
- un seed SaaS complet crée **5 études notariales de test** (tenants),
  leurs comptes de connexion, plans/abonnements/licences/factures SaaS
  et un jeu minimal d'actes/appels par étude.

- Rechargement : `npm run db:migrate` (après effacement via l'API démo ou base vide)
- Effacement : bouton « Effacer la démonstration » sur le tableau de bord (Notaire)

4. Se connecter :
   - Super Admin plateforme: `superadmin` / `ChangezMoi2026!`
   - Études de test (même mot de passe `ChangezMoi2026!`):
     - `kouassi.notaire`, `kouassi.secretariat`, `kouassi.clerc1`, `kouassi.comptable`
     - `konan.notaire`, `konan.secretariat`, `konan.clerc1`, `konan.comptable`
     - `yao.notaire`, `yao.secretariat`, `yao.clerc1`, `yao.comptable`
     - `traore.notaire`, `traore.secretariat`, `traore.clerc1`, `traore.comptable`
     - `soro.notaire`, `soro.secretariat`, `soro.clerc1`, `soro.comptable`

   **Changez ces mots de passe immédiatement.**

## Sécurité — points non négociables avant toute mise en ligne

- Exécuter `npm run test:isolation` : le moindre échec **bloque la livraison**.
  Le test a besoin de deux variables : `DATABASE_URL` (rôle applicatif `notaria_app`)
  et `ADMIN_DATABASE_URL` (compte administrateur, uniquement pour créer les deux
  études fictives du test — jamais utilisé par l'application).
- L'application doit se connecter avec le rôle `notaria_app` (jamais superuser,
  sinon la RLS ne s'applique pas). **La RLS est effectivement posée dans
  `db/schema.pg.sql`** (policies `isolation_*`, `FORCE ROW LEVEL SECURITY`) — le rôle
  `notaria_app` n'est PAS créé automatiquement par la migration (ça nécessiterait un
  privilège CREATEROLE plus large que ce dont elle a besoin) : bootstrap manuel une
  fois par base, procédure en commentaire juste avant le bloc RLS dans ce fichier.
  Le propriétaire du schéma (celui qui joue les migrations, `ADMIN_DATABASE_URL`) a
  besoin de `BYPASSRLS` pour que les fonctions SECURITY DEFINER (auth_lookup...)
  fonctionnent — sans quoi la connexion elle-même est cassée. Un self-check au
  démarrage (`instrumentation.js`) vérifie ces deux points et logue un avertissement
  clair si l'un manque.
- HTTPS obligatoire ; `JWT_SECRET` long et secret ; sauvegardes quotidiennes chiffrées
  (pas encore automatisées sur le déploiement de test actuel — cf. TODO-DEV.md).
- Faire réaliser un test d'intrusion avant l'ouverture au-delà de l'étude pilote.

## Ce que ce socle N'EST PAS

C'est un **point de départ solide (~90 % du périmètre V1)**, pas un produit fini :
il reste l'OAuth Google, les exports, l'écran d'administration des comptes,
l'onboarding Super-Administrateur, les tests de charge et le déploiement supervisé.
Un développeur doit accompagner la mise en production.
