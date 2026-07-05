# NOTARIA — Gestion interne du cabinet notarial

Outil de suivi pour **l'étude de Me KOUASSI MARLENE K. ELISEE** (Abidjan, Côte d'Ivoire) :
registre des appels et courriers, suivi des actes et minutes, tableau de bord et volet financier réservé au Notaire.

> Ne remplace pas les registres officiels (répertoire des minutes). Données couvertes par le secret professionnel.

## Fonctionnalités

| Module | Description |
|---|---|
| Appels & Courriers | Saisie hybride, SLA, colorations par ancienneté |
| Actes & Minutes | Échéances auto (simple +20 j, complexe +30 j, succession +180 j), journal des pièces |
| Tableau de bord | Compteurs, finances (admin), répartitions par conservation, étape, responsable |
| Sécurité | Session 30 min, verrouillage après 5 échecs, changement de mot de passe obligatoire à la 1ère connexion |

## Installation locale (SQLite — 5 minutes)

**Prérequis** : Node.js 18+ (22 recommandé)

```bash
npm install
npm run dev          # migre la base SQLite puis lance http://localhost:3000
```

Sans `DATABASE_URL`, la base SQLite est créée dans `data/notaria.db`.

Comptes de démonstration (mot de passe : `ChangezMoi2026!`) :

| Identifiant | Rôle |
|---|---|
| `notaire` | Notaire / administrateur d'étude |
| `secretariat`, `clerc1`, `accueil` | Collaborateurs |

**Changez ces mots de passe dès la première connexion.**

## Production (Render + PostgreSQL)

Le déploiement est configuré via `render.yaml` :

| Variable | Source |
|---|---|
| `DATABASE_URL` | PostgreSQL Render (lié automatiquement) |
| `JWT_SECRET` | Généré par Render |
| `NODE_ENV` | `production` |
| `PORT` | Injecté par Render |

**Flux de déploiement** :
1. Push sur `main` → Render lance le build (`npm run build`)
2. Au démarrage (`npm start`), `prestart` exécute la migration PostgreSQL (`schema.pg.sql` + `seed.pg.sql`)
3. Sonde de santé : `GET /api/health`

Vérifier la base après déploiement :

```bash
DATABASE_URL="postgresql://..." node scripts/check-pg.js
```

Données de démonstration (PostgreSQL uniquement) :

```bash
psql "$DATABASE_URL" -f db/demo.sql
psql "$DATABASE_URL" -f db/demo_reset.sql   # effacer la démo
```

## Tests

```bash
npm run test:isolation   # vérifie l'isolation entre études (SQLite ou PostgreSQL)
npm run db:verify        # vérifie la base SQLite locale
```

## Fichiers SQL

| Fichier | Usage |
|---|---|
| `db/schema.sqlite.sql` + `db/seed.sqlite.sql` | Développement local |
| `db/schema.pg.sql` + `db/seed.pg.sql` | Production Render |
| `db/demo.sql` / `db/demo_reset.sql` | Données fictives (PostgreSQL) |
