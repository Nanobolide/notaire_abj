# notaire_abj

# NOTARIA — Plateforme SaaS multi-études de gestion notariale (socle V1)

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
| Tableau de bord : compteurs, analyse par Conservation Foncière, comparatif mensuel | ✅ Inclus |
| Journal d'audit (qui, quoi, quand, avant/après) | ✅ Inclus |
| Suppression logique réservée à l'Administrateur (corbeille) | ✅ Inclus (API) |
| Test automatisé d'isolation entre études | ✅ Inclus (`npm run test:isolation`) |
| Connexion Google OAuth du Notaire | ⬜ À brancher (NextAuth) — la connexion par identifiant fonctionne en attendant |
| Exports Excel/PDF, écran corbeille, gestion des comptes par le Notaire, purge décennale | ⬜ Étape suivante |

## Installation (10 minutes)

1. **Prérequis** : Node.js 18+, PostgreSQL 14+ (local, Supabase ou Neon).
2. Copier la configuration :
   ```bash
   cp .env.example .env
   # renseigner DATABASE_URL et un JWT_SECRET aléatoire (openssl rand -hex 32)
   ```
3. Créer la base :
   ```bash
   npm install
   npm run db:init
   ```
4. Lancer :
   ```bash
   npm run dev          # http://localhost:3000
   ```
5. Se connecter avec un compte de démonstration :
   - `notaire` / `ChangezMoi2026!` (Administrateur d'étude)
   - `secretariat`, `clerc1`, `accueil` / même mot de passe (collaborateurs)

   **Changez ces mots de passe immédiatement.**

## Sécurité — points non négociables avant toute mise en ligne

- Exécuter `npm run test:isolation` : le moindre échec **bloque la livraison**.
  Le test a besoin de deux variables : `DATABASE_URL` (rôle applicatif `notaria_app`)
  et `ADMIN_DATABASE_URL` (compte administrateur, uniquement pour créer les deux
  études fictives du test — jamais utilisé par l'application).
- L'application doit se connecter avec le rôle `notaria_app` (jamais superuser,
  sinon la RLS ne s'applique pas).
- HTTPS obligatoire ; `JWT_SECRET` long et secret ; sauvegardes quotidiennes chiffrées.
- Faire réaliser un test d'intrusion avant l'ouverture au-delà de l'étude pilote.

## Ce que ce socle N'EST PAS

C'est un **point de départ solide (~90 % du périmètre V1)**, pas un produit fini :
il reste l'OAuth Google, les exports, l'écran d'administration des comptes,
l'onboarding Super-Administrateur, les tests de charge et le déploiement supervisé.
Un développeur doit accompagner la mise en production.
