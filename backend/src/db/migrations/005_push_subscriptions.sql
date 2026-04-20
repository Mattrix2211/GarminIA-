-- Push subscriptions pour notifications Web Push
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users see own subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);

create policy "Users manage own subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);
