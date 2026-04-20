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
│   │   ├── components/    # Composants UI réutilisables
│   │   ├── pages/         # Pages de l'app (dashboard, séance, chat, stats)
│   │   ├── hooks/         # Hooks React custom (useGarminData, useAI, etc.)
│   │   ├── lib/           # Clients Supabase, API, utilitaires
│   │   └── types/         # Types TypeScript partagés
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/        # Routes API (auth, garmin, ai, plans, sessions)
│   │   ├── services/      # Logique métier (AnthropicService, GarminService, etc.)
│   │   ├── middleware/     # Auth, validation, rate limiting
│   │   └── db/            # Migrations Supabase, types DB
└── shared/            # Types et constantes partagés frontend/backend
```

## Commandes de développement

### Frontend
```bash
cd frontend
npm install
npm run dev          # Serveur dev Vite (port 5173)
npm run build        # Build production
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm run test         # Vitest
npm run test -- --run src/components/MyComponent.test.tsx  # Un seul test
```

### Backend
```bash
cd backend
npm install
npm run dev          # ts-node-dev avec hot reload (port 3001)
npm run build        # tsc
npm run lint
npm run test         # Jest
npm run test -- --testPathPattern=services/ai  # Un seul fichier de test
```

## Variables d'environnement

Copier `.env.example` → `.env`. Variables critiques :
- `ANTHROPIC_API_KEY` — obligatoire pour tout appel IA
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_KEY` — base de données et auth
- `GARMIN_CLIENT_ID` + `GARMIN_CLIENT_SECRET` — OAuth Garmin
- `VITE_API_URL` — URL du backend (frontend)

## Architecture IA — règles absolues

**Avant tout appel à l'API Anthropic, lire le skill `product-self-knowledge`** pour les paramètres exacts du modèle. Ne jamais deviner le nom du modèle ou les paramètres.

- Modèle : Claude Sonnet (version la plus récente disponible)
- Streaming obligatoire pour le chat coaching
- Prompt system : inclure toujours le profil complet de l'utilisateur, ses données de récupération du jour (HRV, Body Battery, sommeil, charge), son sport et ses objectifs
- Ton du coach : bienveillant mais exigeant, factuel, adapté au niveau (technique pour compétiteurs, simple pour débutants)

Règles d'adaptation automatique que Claude doit appliquer :
- HRV basse 3 jours consécutifs → proposer semaine de décharge
- Ratio charge aiguë/chronique > 1,5 → alerte risque blessure
- FTP progresse → recalcul immédiat de toutes les zones
- 5 jours consécutifs sans repos → recommandation proactive

## Schéma base de données Supabase

Tables principales : `users`, `user_profiles`, `user_devices`, `garmin_data_daily`, `training_plans`, `training_sessions`, `sets_history`, `weight_history`, `ai_recommendations`, `chat_history`, `weekly_summaries`.

La table `garmin_data_daily` centralise : HRV, Body Battery, score sommeil (phases), FC repos, stress, charge aiguë (7j), charge chronique (28j), temps de récupération.

## Authentification

Supabase Auth — email/password + OAuth Google. Le JWT Supabase est transmis dans le header `Authorization: Bearer <token>` sur toutes les routes backend protégées.

## Onboarding wizard (5 étapes)

1. Profil de base (prénom, âge, poids, taille)
2. Sport(s) principal(aux) — sélection multiple possible
3. Niveau (Débutant → Compétiteur)
4. Objectifs (avec date cible si compétition)
5. Connexion appareils (Garmin, Wahoo, Apple Health, Polar, Suunto, Whoop, Oura, manuel)

## UX — référence absolue

L'application HTML offline v3 (97 Ko, utilisateur Matthis) est la référence UX. Fonctionnalités à reproduire fidèlement :
- Navigation par semaine, détection automatique du jour
- Mode séance plein écran : stepper exercice par exercice avec progression
- Chrono récupération inter-séries avec alerte sonore
- Mode AMRAP/CrossFit : chrono global + compteur de tours
- Suivi charges par série avec historique semaine précédente
- Journal de bord avec métriques adaptées par sport
- Poids : une seule saisie par semaine

Palette : fond `#0f0f0f`, accent `#c8f064`, titres `DM Serif Display`, corps `DM Sans`.

## Intégrations API externes

- **Garmin Health API** : HRV, sommeil, Body Battery, stress, FC repos
- **Garmin Connect IQ API** : activités, puissance, allure, zones FC, VO2 max
- **Wahoo API** : home trainer, puissance, cadence
- **Apple HealthKit** : fallback si pas de Garmin

## Ordre de développement

1. Auth Supabase + wizard onboarding
2. OAuth Garmin + données matinales
3. Dashboard personnalisé par sport
4. Recommandation IA matinale
5. Génération plan d'entraînement dynamique
6. Mode séance plein écran + AMRAP
7. Suivi charges muscu
8. Journal de bord
9. Chat coaching streaming
10. Conseils proactifs automatiques
11. Résumés hebdomadaires par email
12. Wahoo + Apple Health
13. Stats avancées (FTP, VO2 max, courbe poids)
14. Déploiement Vercel + Railway
