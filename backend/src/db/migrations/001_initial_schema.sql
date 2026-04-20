-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User profiles
create table if not exists user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  first_name text not null,
  age integer,
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  sports text[] not null default '{}',
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced', 'competitor')),
  goals text[] not null default '{}',
  target_competition_date date,
  available_days integer[] not null default '{1,2,3,4,5}',
  max_session_duration_min integer not null default 90,
  equipment text[] not null default '{}',
  vo2max numeric(5,2),
  ftp_watts integer,
  resting_hr integer,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garmin daily data
create table if not exists garmin_data_daily (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  hrv_ms numeric(6,2),
  body_battery_max integer,
  body_battery_min integer,
  sleep_score integer,
  sleep_duration_min integer,
  sleep_deep_min integer,
  sleep_rem_min integer,
  sleep_light_min integer,
  sleep_awake_min integer,
  resting_hr integer,
  stress_avg integer,
  acute_load numeric(6,2),
  chronic_load numeric(6,2),
  recovery_time_hours integer,
  training_status text,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Training plans
create table if not exists training_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  sport text not null,
  goal text,
  generated_by_ai boolean not null default true,
  created_at timestamptz not null default now()
);

-- Training sessions
create table if not exists training_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references training_plans(id) on delete set null,
  date date not null,
  sport text not null,
  title text not null,
  description text,
  duration_min integer,
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'skipped', 'modified')),
  perceived_effort integer check (perceived_effort between 1 and 10),
  mood_stars integer check (mood_stars between 1 and 5),
  notes text,
  hr_avg integer,
  power_avg_watts integer,
  pace_per_km text,
  tss numeric(6,2),
  created_at timestamptz not null default now()
);

-- Sets history (musculation/crossfit)
create table if not exists sets_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references training_sessions(id) on delete cascade not null,
  exercise_name text not null,
  set_number integer not null,
  weight_kg numeric(6,2),
  reps integer,
  duration_sec integer,
  notes text,
  created_at timestamptz not null default now()
);

-- Weight history (weekly)
create table if not exists weight_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start_date date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz not null default now(),
  unique(user_id, week_start_date)
);

-- AI recommendations
create table if not exists ai_recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  type text not null check (type in ('morning', 'proactive', 'weekly_summary')),
  content text not null,
  data_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- Chat history
create table if not exists chat_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Weekly summaries
create table if not exists weekly_summaries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start_date date not null,
  content text not null,
  sessions_count integer,
  tss_total numeric(8,2),
  created_at timestamptz not null default now(),
  unique(user_id, week_start_date)
);

-- Indexes
create index on garmin_data_daily(user_id, date desc);
create index on training_sessions(user_id, date desc);
create index on sets_history(user_id, session_id);
create index on chat_history(user_id, created_at desc);
create index on ai_recommendations(user_id, date desc);

-- RLS
alter table user_profiles enable row level security;
alter table garmin_data_daily enable row level security;
alter table training_plans enable row level security;
alter table training_sessions enable row level security;
alter table sets_history enable row level security;
alter table weight_history enable row level security;
alter table ai_recommendations enable row level security;
alter table chat_history enable row level security;
alter table weekly_summaries enable row level security;

-- RLS policies (backend accède via service key, bypass RLS)
create policy "Users can read own profile" on user_profiles
  for select using (auth.uid() = user_id);
create policy "Users can read own garmin data" on garmin_data_daily
  for select using (auth.uid() = user_id);
create policy "Users can read own sessions" on training_sessions
  for select using (auth.uid() = user_id);
create policy "Users can read own chat" on chat_history
  for select using (auth.uid() = user_id);
