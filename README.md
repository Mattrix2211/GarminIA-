# GarminIA

**Plateforme SaaS de coaching sportif personnalisé par IA.**  
Analyse vos données de récupération Garmin, génère des plans d'entraînement adaptatifs et vous coach en langage naturel — le tout piloté par Claude (Anthropic).

---

## Aperçu

GarminIA connecte vos capteurs (Garmin, Wahoo, Apple Health) à une IA de coaching qui comprend votre état physiologique du moment : HRV, Body Battery, qualité de sommeil, charge aiguë/chronique. Chaque matin, votre coach IA ajuste automatiquement votre programme et vous répond en chat temps réel.

**Sports supportés** : Triathlon · Cyclisme · Course à pied · Trail · Natation · Musculation · CrossFit

---

## Fonctionnalités

### Récupération & Santé
- HRV, Body Battery, score de sommeil, FC repos, stress Garmin
- Alertes proactives : risque blessure (ratio charge > 1,5), accumulation fatigue, semaine de décharge

### Entraînement
- Génération de plans d'entraînement dynamiques par Claude
- Mode séance plein écran : stepper exercice par exercice
- Chrono récupération inter-séries avec alerte sonore
- Mode AMRAP / CrossFit : chrono global + compteur de tours
- Suivi des charges par série avec historique semaine précédente

### Calendrier
- Vue mensuelle façon Garmin Connect
- Glisser-déposer pour déplacer les séances (desktop)
- Tap-to-move pour mobile
- Semaines résumées (volume total, TSS)
- Dot HRV par jour

### Dashboard personnalisable
- 7 widgets configurables : Récupération, Sommeil, Charge, Coach IA, Sport du jour, Séances, Alertes
- Mode édition : réordonnement par drag & drop, masquage, changement de visualisation
- Configuration persistée en localStorage

### Coach IA (Claude)
- Chat coaching en streaming (réponse token par token)
- Contexte complet injecté : profil, métriques du jour, plan en cours
- Recommandation matinale automatique
- Adaptation au niveau (débutant → compétiteur)

### Intégrations
- **Garmin** : Health API (HRV, sommeil, Body Battery) + Connect IQ (activités, puissance, zones)
- **Wahoo** : home trainer, puissance, cadence
- **Apple HealthKit** : fallback multi-plateforme

### Autres
- PWA installable (manifest + service worker)
- Push notifications
- Auth Supabase (email/password + Google OAuth)
- Wizard onboarding 5 étapes
- Mode démo intégré (`VITE_DEMO_MODE=true`)

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite, Zustand, Recharts |
| Backend | Node.js, Express, TypeScript, Zod |
| Base de données | Supabase (PostgreSQL + Auth) |
| IA | Anthropic SDK — Claude Sonnet (streaming) |
| Style | CSS Modules, dark theme, DM Serif Display + DM Sans |
| Déploiement | Vercel (frontend) · Railway (backend) |

---

## Structure du projet

```
GarminIA/
├── frontend/                  # React + TypeScript (Vite)
│   └── src/
│       ├── pages/
│       │   ├── dashboard/     # Dashboard personnalisable
│       │   ├── calendar/      # Calendrier mensuel
│       │   ├── session/       # Mode séance plein écran
│       │   ├── chat/          # Chat coaching streaming
│       │   ├── stats/         # Statistiques avancées
│       │   ├── onboarding/    # Wizard 5 étapes
│       │   └── profile/       # Profil & appareils
│       ├── components/
│       │   ├── dashboard/     # SportWidget, AICoachWidget…
│       │   └── ui/            # Composants génériques
│       ├── lib/
│       │   ├── api.ts         # Client HTTP + demo mode
│       │   ├── sports.ts      # SPORT_COLORS, sportEmoji
│       │   ├── dashboardConfig.ts  # Config widgets localStorage
│       │   └── demo.ts        # Données démo complètes
│       └── stores/            # Zustand (auth, profile)
├── backend/                   # Node.js + Express
│   └── src/
│       ├── routes/            # auth, garmin, wahoo, apple, sessions,
│       │                      # plans, coach, chat, dashboard, stats,
│       │                      # calendar, push, profile
│       ├── services/          # AnthropicService, GarminService…
│       ├── middleware/        # Auth JWT, rate limiting, helmet
│       └── db/                # Migrations Supabase (001–006)
└── shared/                    # Types TypeScript partagés
```

---

## Installation

### Prérequis

- Node.js ≥ 18
- Compte Supabase
- Clé API Anthropic
- (Optionnel) Credentials Garmin OAuth

### 1. Cloner & installer

```bash
git clone https://github.com/mattrix2211/garminia-.git
cd garminia-
npm install
```

### 2. Variables d'environnement

**Backend** — copier `backend/.env.example` → `backend/.env` :

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
GARMIN_CLIENT_ID=...
GARMIN_CLIENT_SECRET=...
WAHOO_CLIENT_ID=...
WAHOO_CLIENT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
FRONTEND_URL=http://localhost:5173
```

**Frontend** — copier `frontend/.env.example` → `frontend/.env` :

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DEMO_MODE=false
```

### 3. Base de données

Appliquer les migrations dans Supabase SQL Editor (dans l'ordre) :

```
backend/src/db/migrations/001_initial_schema.sql
backend/src/db/migrations/002_training_plans.sql
backend/src/db/migrations/003_sessions.sql
backend/src/db/migrations/004_ai_tables.sql
backend/src/db/migrations/005_push_subscriptions.sql
backend/src/db/migrations/006_calendar.sql
```

### 4. Lancer en développement

```bash
npm run dev
# Frontend : http://localhost:5173
# Backend  : http://localhost:3001
```

### Mode démo (sans backend)

```bash
cd frontend
VITE_DEMO_MODE=true npm run dev
```

Toutes les données sont simulées — aucune API requise.

---

## Home Lab — déploiement Docker

Architecture : un seul port exposé. Nginx sert le frontend **et** proxifie `/api/*` vers le backend. Le backend n'est pas accessible directement depuis l'extérieur.

```
[navigateur] ──→ [nginx:80]
                    ├── /*     → fichiers statiques React
                    └── /api/* → backend:3001 (réseau Docker interne)
```

### 1. Configurer les variables d'environnement

```bash
# Variables pour le build frontend (à la racine)
cp .env.docker.example .env
# Remplir VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, PORT

# Variables du backend
cp backend/.env.example backend/.env
# Remplir ANTHROPIC_API_KEY, SUPABASE_*, GARMIN_*, etc.
```

### 2. Lancer

```bash
docker compose up -d --build
```

L'app est disponible sur `http://ip-de-votre-machine`.

### 3. Commandes utiles

```bash
docker compose logs -f backend     # logs du backend en temps réel
docker compose logs -f frontend    # logs nginx
docker compose restart backend     # redémarrer le backend
docker compose down                # arrêter tout
docker compose up -d --build       # rebuild + redémarrer après une mise à jour
```

### Mise à jour

```bash
git pull
docker compose up -d --build
```

---

## Scripts disponibles

```bash
# Racine (monorepo)
npm run dev          # Lance frontend + backend en parallèle
npm run build        # Build production (shared → backend → frontend)
npm run lint         # ESLint sur les deux workspaces
npm run type-check   # tsc --noEmit sur les deux workspaces

# Frontend uniquement
cd frontend
npm run test         # Vitest
npm run preview      # Preview du build production

# Backend uniquement
cd backend
npm run test         # Jest
```

---

## API — principaux endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/dashboard/status` | Métriques du jour (HRV, BB, sommeil…) |
| `GET` | `/api/calendar/sessions?month=YYYY-MM` | Séances du mois |
| `GET` | `/api/calendar/hrv?month=YYYY-MM` | HRV par jour |
| `PATCH` | `/api/sessions/:id/move` | Déplacer une séance |
| `POST` | `/api/coach/recommend` | Recommandation IA matinale |
| `POST` | `/api/chat` | Chat coaching (streaming SSE) |
| `GET` | `/api/plans/current` | Plan d'entraînement actif |
| `GET` | `/api/stats/load` | Courbe de charge CTL/ATL/TSB |
| `POST` | `/api/garmin/sync` | Synchronisation données Garmin |

Toutes les routes protégées nécessitent `Authorization: Bearer <supabase_jwt>`.

---

## Déploiement cloud (alternative)

### Frontend → Vercel

```bash
cd frontend && npm run build
# Déployer dist/ via Vercel CLI
# Ajouter VITE_API_URL=https://votre-backend.railway.app dans les settings Vercel
```

### Backend → Railway

Connecter le repo GitHub à Railway, pointer sur le workspace `backend`.  
Railway détecte Node.js automatiquement. Ajouter les variables de `backend/.env` dans les settings Railway.

---

## Architecture IA

Le service `AnthropicService` construit un prompt système qui inclut :
- Profil complet de l'utilisateur (sport, niveau, objectifs, FTP/VO2max)
- Métriques de récupération du jour (HRV, Body Battery, sommeil, charge)
- Historique récent des 7 derniers jours
- Plan d'entraînement en cours

Règles d'adaptation automatiques :
- HRV basse 3 jours consécutifs → semaine de décharge proposée
- Ratio charge aiguë/chronique > 1,5 → alerte risque blessure
- 5 jours sans repos → recommandation proactive
- FTP progresse → recalcul immédiat des zones

Le chat utilise le streaming SSE pour un affichage token par token.

---

## Palette & Design

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--bg` | `#0f0f0f` | Fond principal |
| `--accent` | `#c8f064` | Accent (Cyclisme + UI) |
| `--bg-card` | `#1a1a1a` | Cartes |
| `--border` | `#2a2a2a` | Bordures |
| Titres | DM Serif Display | H1, widgets |
| Corps | DM Sans | Tout le reste |

---

## Licence

Propriétaire — tous droits réservés.
