-- Index sur les plans actifs
create index if not exists training_plans_user_dates
  on training_plans(user_id, start_date, end_date);

-- Index sur les séances par plan
create index if not exists training_sessions_plan
  on training_sessions(plan_id, date);

-- Nettoyage automatique des oauth_state expirés (fonction + cron via pg_cron si disponible)
create or replace function cleanup_expired_oauth_state()
returns void language sql as $$
  delete from oauth_state where expires_at < now();
$$;
