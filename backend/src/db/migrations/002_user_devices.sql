create table if not exists user_devices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  access_token text,
  access_token_secret text,
  refresh_token text,
  provider_user_id text,
  connected boolean not null default false,
  connected_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, provider)
);

-- Stocker temporairement les request tokens OAuth 1.0
create table if not exists oauth_state (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  oauth_token text not null unique,
  oauth_token_secret text not null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

alter table user_devices enable row level security;
alter table oauth_state enable row level security;

create index on user_devices(user_id);
create index on oauth_state(oauth_token);
