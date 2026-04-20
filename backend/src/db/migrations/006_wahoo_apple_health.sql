-- Table centralisée des activités synchronisées multi-sources avec déduplication
create table if not exists synced_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Source et identifiant externe
  source text not null check (source in ('garmin', 'wahoo', 'apple_health', 'manual')),
  external_id text not null,

  -- Données de l'activité
  sport text not null,
  date date not null,
  start_time timestamptz not null,
  duration_min integer not null,
  hr_avg integer,
  power_avg_watts integer,
  distance_m numeric,
  elevation_m numeric,
  calories integer,

  -- Déduplication : fingerprint = sport|date|duration_bucket
  dedup_fingerprint text not null,

  created_at timestamptz default now(),
  unique(user_id, source, external_id)
);

create index if not exists synced_activities_user_date
  on synced_activities(user_id, date desc);

create index if not exists synced_activities_dedup
  on synced_activities(user_id, dedup_fingerprint);

alter table synced_activities enable row level security;

create policy "Users see own activities"
  on synced_activities for select using (auth.uid() = user_id);

create policy "Users manage own activities"
  on synced_activities for all using (auth.uid() = user_id);
