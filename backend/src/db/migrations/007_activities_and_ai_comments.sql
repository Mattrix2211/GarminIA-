-- Migration 007 : activités Garmin importées + commentaires IA par séance

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'plan'
    CHECK (source IN ('plan', 'garmin', 'wahoo', 'apple', 'manual')),
  ADD COLUMN IF NOT EXISTS garmin_activity_id BIGINT,
  ADD COLUMN IF NOT EXISTS distance_meters FLOAT,
  ADD COLUMN IF NOT EXISTS ai_comment TEXT,
  ADD COLUMN IF NOT EXISTS ai_comment_generated_at TIMESTAMPTZ;

-- Index partiel unique pour éviter les doublons d'activités Garmin
CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_garmin_uniq
  ON training_sessions (user_id, garmin_activity_id)
  WHERE garmin_activity_id IS NOT NULL;
