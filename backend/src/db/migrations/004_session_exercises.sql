-- Ajouter une colonne JSONB pour les exercices structurés
-- (rétrocompatible : l'ancienne colonne description reste pour le texte libre)
alter table training_sessions
  add column if not exists exercises jsonb default '[]'::jsonb;

-- Index pour les requêtes sur les exercices
create index if not exists training_sessions_exercises
  on training_sessions using gin(exercises);

comment on column training_sessions.exercises is
  'JSON array of {name, sets, reps, rest, notes, weight} objects';
