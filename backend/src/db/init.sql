-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Auth local ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profils ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name              TEXT,
  last_name               TEXT,
  age                     INTEGER,
  weight_kg               NUMERIC(5,2),
  height_cm               INTEGER,
  sports                  TEXT[]    DEFAULT '{}',
  primary_sport           TEXT,
  level                   TEXT,
  goals                   TEXT[]    DEFAULT '{}',
  equipment               TEXT[]    DEFAULT '{}',
  target_competition_date DATE,
  ftp_watts               INTEGER,
  vo2max                  NUMERIC(4,1),
  resting_hr              INTEGER,
  available_days          INTEGER[] DEFAULT '{}',
  max_session_duration_min INTEGER  DEFAULT 90,
  onboarding_completed    BOOLEAN   DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Données Garmin journalières ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garmin_data_daily (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                 DATE NOT NULL,
  hrv_ms               NUMERIC(6,2),
  body_battery_max     INTEGER,
  body_battery_min     INTEGER,
  sleep_score          INTEGER,
  sleep_duration_min   INTEGER,
  sleep_deep_min       INTEGER,
  sleep_rem_min        INTEGER,
  sleep_light_min      INTEGER,
  sleep_awake_min      INTEGER,
  resting_hr           INTEGER,
  stress_avg           INTEGER,
  acute_load           NUMERIC(6,2),
  chronic_load         NUMERIC(6,2),
  recovery_time_hours  INTEGER,
  training_status      TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ── Plans d'entraînement ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date       DATE NOT NULL,
  end_date         DATE,
  sport            TEXT,
  goal             TEXT,
  status           TEXT DEFAULT 'active',
  generated_by_ai  BOOLEAN DEFAULT FALSE,
  raw_ai_response  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Séances d'entraînement ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id          UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  date             DATE NOT NULL,
  sport            TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  duration_min     INTEGER,
  tss              INTEGER,
  status           TEXT DEFAULT 'planned',
  exercises        JSONB DEFAULT '[]',
  completed_at     TIMESTAMPTZ,
  mood_stars       INTEGER,
  perceived_effort INTEGER,
  hr_avg           INTEGER,
  power_avg_watts  INTEGER,
  pace_per_km      TEXT,
  distance_m       INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Historique des séries (musculation) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sets_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number    INTEGER,
  reps          INTEGER,
  weight_kg     NUMERIC(5,2),
  duration_sec  INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Suivi du poids ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weight_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  weight_kg       NUMERIC(5,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- ── Recommandations IA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  date          DATE,
  content       TEXT NOT NULL,
  data_snapshot JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Historique du chat ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Résumés hebdomadaires ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date  DATE NOT NULL,
  content          TEXT NOT NULL,
  sessions_count   INTEGER DEFAULT 0,
  tss_total        INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- ── Appareils connectés ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_devices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  access_token        TEXT,
  access_token_secret TEXT,
  refresh_token       TEXT,
  token_expires_at    TIMESTAMPTZ,
  provider_user_id    TEXT,
  connected           BOOLEAN DEFAULT FALSE,
  connected_at        TIMESTAMPTZ,
  last_sync_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ── OAuth state temporaire ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_state (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  oauth_token         TEXT UNIQUE,
  oauth_token_secret  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- ── Push notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  expiration_time BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- ── Activités synchronisées (multi-source) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS synced_activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source            TEXT NOT NULL,
  external_id       TEXT,
  sport             TEXT NOT NULL,
  date              DATE NOT NULL,
  start_time        TIMESTAMPTZ,
  duration_min      INTEGER,
  hr_avg            INTEGER,
  power_avg_watts   INTEGER,
  distance_m        INTEGER,
  calories          INTEGER,
  dedup_fingerprint TEXT,
  raw_data          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source, external_id)
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_garmin_daily_user_date   ON garmin_data_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date        ON training_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_plan             ON training_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_user              ON ai_recommendations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synced_activities_user    ON synced_activities(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_synced_activities_dedup   ON synced_activities(user_id, dedup_fingerprint);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user       ON refresh_tokens(user_id);
