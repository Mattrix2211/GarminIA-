# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble du projet

Plateforme SaaS de coaching sportif personnalisé par IA. Multi-utilisateurs, multi-sports (Triathlon, Cyclisme, Course, Trail, Natation, Musculation, CrossFit). Claude (Anthropic) est le moteur intelligent central — il analyse les données de récupération, génère les plans d'entraînement, adapte les séances et coach l'utilisateur en langage naturel.

## Stack technique

- **Frontend** : React + TypeScript, Vite, mobile-first (iPad/iPhone), dark mode (`#0f0f0f` / accent `#c8f064`)
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : Supabase (PostgreSQL) + Supabase Auth
- **IA** : API Anthropic — Claude Sonnet (modèle le plus récent), streaming activé pour le chat
- **Déploiement** : Frontend → Vercel, Backend → Railway

## Structure du projet

```
/
├── frontend/          # React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/   # SportWidget (multi-sport, props minimal)
│   │   │   ├── garmin/      # GarminConnectButton, GarminOnboardingGuide
│   │   │   ├── session/     # ClassicStepper, AmrapStepper, ExerciseFiche
│   │   │   └── ui/          # Icons.tsx, LoadingScreen
│   │   ├── pages/
│   │   │   ├── dashboard/   # DashboardPage (widgets personnalisables)
│   │   │   ├── calendar/    # CalendarPage (vue mensuelle + drag-and-drop)
│   │   │   ├── session/     # SessionPage (mode plein écran)
│   │   │   ├── chat/        # ChatPage (streaming IA)
│   │   │   ├── stats/       # StatsPage
│   │   │   ├── journal/     # JournalPage
│   │   │   ├── profile/     # ProfilePage
│   │   │   ├── settings/    # SettingsPage
│   │   │   ├── onboarding/  # OnboardingPage (5 étapes)
│   │   │   └── auth/        # LoginPage, RegisterPage
│   │   ├── hooks/           # useGarminSync, usePushNotifications
│   │   ├── lib/
│   │   │   ├── api.ts       # apiGet/apiPost/apiPatch + mock DEMO_MODE
│   │   │   ├── demo.ts      # Données démo complètes (profil, séances, calendrier…)
│   │   │   ├── dashboardConfig.ts  # Config widgets localStorage (visibilité, vizType, ordre)
│   │   │   ├── sports.ts    # SPORT_COLORS + sportEmoji (partagé)
│   │   │   ├── exerciseDb.ts       # Base exercices locale avec GIF URLs
│   │   │   └── supabase.ts
│   │   └── stores/          # authStore, profileStore (Zustand)
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/        # auth, garmin, ai, plans, sessions, push, wahoo, apple, calendar
│   │   ├── services/      # AnthropicService, GarminService, WahooService, AppleHealthService,
│   │   │                  # ActivityDeduplicator, PushService
│   │   ├── middleware/     # Auth, validation, rate limiting
│   │   └── db/            # Migrations Supabase (001→006)
└── shared/            # Types et constantes partagés frontend/backend
```

## Commandes de développement

### Frontend
```bash
cd frontend
npm install
npm run dev          # Serveur dev Vite (port 5173)
npm run build        # Build production
npm run type-check   # tsc --noEmit  ← toujours vérifier avant de commit
npm run test         # Vitest
```

### Backend
```bash
cd backend
npm install
npm run dev          # ts-node-dev avec hot reload (port 3001)
npm run build        # tsc
npm run test         # Jest
```

## Mode démo (VITE_DEMO_MODE=true)

Toutes les routes API sont mockées dans `frontend/src/lib/api.ts` → `demoResponse()`.  
Données dans `frontend/src/lib/demo.ts` : profil Matthis, séances, calendrier avril-mai 2026, HRV, stats, alertes.  
**Toujours ajouter un mock** quand une nouvelle route API est créée.

## Variables d'environnement

Copier `.env.example` → `.env`. Variables critiques :
- `ANTHROPIC_API_KEY` — obligatoire pour tout appel IA
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_KEY`
- `GARMIN_CLIENT_ID` + `GARMIN_CLIENT_SECRET` — OAuth Garmin (OAuth 1.0a)
- `WAHOO_CLIENT_ID` + `WAHOO_CLIENT_SECRET` — OAuth Wahoo (OAuth 2.0)
- `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` — Push notifications
- `VITE_API_URL` — URL du backend (frontend)

## Architecture IA — règles absolues

**Avant tout appel à l'API Anthropic, lire le skill `product-self-knowledge`** pour les paramètres exacts du modèle.

- Modèle : Claude Sonnet (version la plus récente disponible)
- Streaming obligatoire pour le chat coaching
- Prompt system : inclure toujours le profil complet de l'utilisateur, ses données de récupération du jour (HRV, Body Battery, sommeil, charge), son sport et ses objectifs
- Ton du coach : bienveillant mais exigeant, factuel, adapté au niveau

Règles d'adaptation automatique :
- HRV basse 3 jours consécutifs → proposer semaine de décharge
- Ratio charge aiguë/chronique > 1,5 → alerte risque blessure
- FTP progresse → recalcul immédiat de toutes les zones
- 5 jours consécutifs sans repos → recommandation proactive

## Schéma base de données Supabase

Tables principales : `users`, `user_profiles`, `user_devices`, `garmin_data_daily`, `training_plans`, `training_sessions`, `sets_history`, `weight_history`, `ai_recommendations`, `chat_history`, `weekly_summaries`, `push_subscriptions`, `synced_activities`.

- `garmin_data_daily` : HRV, Body Battery, score sommeil (phases), FC repos, stress, charge aiguë (7j), charge chronique (28j), temps de récupération
- `synced_activities` : activités multi-sources avec `dedup_fingerprint` = `sport|date|round(duration/5)*5`
- `push_subscriptions` : endpoint, p256dh, auth, expiration (Web Push API)

Migrations : `backend/src/db/migrations/001` → `006`.

## Authentification

Supabase Auth — email/password + OAuth Google. JWT transmis dans `Authorization: Bearer <token>`.

## Navigation

Bottom nav (5 items) : Accueil `/` · Coach `/chat` · Calendrier `/calendar` · Stats `/stats` · Réglages `/settings`  
Pages hors nav : `/journal`, `/profile`, `/session/:id`, `/onboarding`

## Fonctionnalités implémentées

### PWA & Offline
- `frontend/public/manifest.json` + `sw.js` (cache-first assets, network-first API, push handler)
- SW enregistré dans `main.tsx`
- Icons SVG dans `public/icons/`

### Onboarding Garmin guidé
- `GarminOnboardingGuide.tsx` : 4 étapes visuelles, QR code SVG, OAuth dans popup
- Intégré à l'étape 5 de l'onboarding

### Fiches exercice + GIFs
- `lib/exerciseDb.ts` : 18 exercices en français, GIF URLs (ExerciseDB CDN), instructions, muscles
- `ExerciseFiche.tsx` : drawer slide-up, 3 onglets (Technique / Muscles / Conseils)
- Accessible depuis `ClassicStepper` en tappant le nom de l'exercice

### Dashboard multi-sport
- `SportWidget.tsx` : détecte le sport du jour, affiche les zones spécifiques
  - Cyclisme/Triathlon : 6 zones de puissance (% FTP)
  - Course : 5 zones FC (% FCmax)
  - Trail, Natation, Muscu, CrossFit : widgets dédiés
  - Prop `minimal` disponible pour affichage compact

### Dashboard personnalisable
- `lib/dashboardConfig.ts` : `WIDGET_DEFS` (7 widgets), `loadDashboardConfig` / `saveDashboardConfig`
- Config persistée en localStorage (`dash_cfg_v1`)
- Mode édition : toggle visibilité (œil), changer vizType (chips), réordonner (↑↓ + drag-and-drop)
- Widgets : `recovery` (grille/jauges/compact), `sleep_phases` (barres/score), `load` (détaillé/compact), `ai_coach` (complet/compact), `sport_widget` (complet/minimal), `sessions_today` (cartes/liste), `proactive_alerts` (complètes/compactes)

### Calendrier d'entraînement (`/calendar`)
- Vue mensuelle avec navigation mois précédent/suivant
- Pills de séances colorées par sport (voir `lib/sports.ts` → `SPORT_COLORS`)
- Dot HRV par jour (vert ≥55ms / orange ≥40ms / rouge <40ms)
- Déplacement de séance : **drag-and-drop** (desktop) + **tap→sélection→tap** (mobile)
- Rollback optimiste si l'API `PATCH /api/sessions/:id/move` échoue
- Résumé de charge par semaine (mini barre + heures + TSS)
- API : `GET /api/calendar/sessions?month=YYYY-MM`, `GET /api/calendar/hrv?month=YYYY-MM`

### Notifications push
- `usePushNotifications.ts` : VAPID, PushManager, subscribe/unsubscribe
- `backend/src/routes/push.ts` : `sendPushToUser(userId, payload)` utilisé par les autres services
- Table `push_subscriptions` (migration 005)

### Wahoo + Apple Health + Déduplication
- `WahooService.ts` : OAuth 2.0, auto-refresh, sync activités
- `AppleHealthService.ts` : import JSON, normalisation `HKWorkoutActivityType*`
- `ActivityDeduplicator.ts` : fingerprint `sport|date|round(duration/5)*5`, priorité Garmin > Wahoo > Apple > Manuel
- Table `synced_activities` (migration 006)

### Page Réglages (`/settings`)
- Sections accordéon : Compte, Métriques (FTP/VO2max/FC), Appareils, Notifications, Coaching IA, Sports & Objectifs, Données
- Connexion Garmin/Wahoo via OAuth, import Apple Health JSON

### ProfilePage
- Hero athlète : avatar, dot sync Garmin, stat cards (séances semaine, FTP, J-X compétition)
- Grille physiologique (VO2max, FC repos, FTP) avec barre colorée par métrique
- Alertes coach récentes, liens rapides

## Constantes partagées

```typescript
// frontend/src/lib/sports.ts
SPORT_COLORS: Record<string, string>  // utilisé dans CalendarPage ET DashboardPage
sportEmoji(sport): string

// frontend/src/components/ui/Icons.tsx
// Factory d(path, extra?) → composant SVG 20×20
// Exports: IconChevronRight, IconCheck, IconUser, IconBell, IconTarget, IconActivity,
//          IconWatch, IconBike, IconApple, IconDatabase, IconShield, IconTrash,
//          IconDownload, IconSliders, IconBrain, IconMoon, IconInfo, IconGear, IconWifi
```

## Intégrations API externes

- **Garmin Health API** : HRV, sommeil, Body Battery, stress, FC repos (OAuth 1.0a)
- **Garmin Connect IQ API** : activités, puissance, allure, zones FC, VO2 max
- **Wahoo API** : home trainer, puissance, cadence (OAuth 2.0)
- **Apple HealthKit** : import JSON manuel (fallback)
- **ExerciseDB** : GIFs exercices (`v2.exercisedb.io/image/:id`)
- **Web Push (VAPID)** : notifications matin + rappels séance

## UX — référence absolue

Palette : fond `#0f0f0f`, accent `#c8f064`, titres `DM Serif Display`, corps `DM Sans`.  
Mobile-first (375px). Bottom nav fixe avec `safe-area-inset-bottom`.  
Icônes SVG custom monochromes dans `Icons.tsx` (viewBox 20×20) et nav SVG inline dans `AppLayout.tsx`.

Fonctionnalités clés :
- Mode séance plein écran : stepper exercice par exercice, chrono récupération, AMRAP
- Fiches exercice avec GIF en drawer slide-up
- Calendrier : déplacer les séances par drag ou tap
- Dashboard : personnaliser les widgets en mode édition
