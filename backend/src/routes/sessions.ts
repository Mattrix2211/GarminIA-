import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { pool } from '../lib/db'
import { generateSessionComment } from '../services/AnthropicService'

export const sessionsRouter = Router()

sessionsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

  const { data, error } = await supabaseAdmin
    .from('training_sessions')
    .select('*')
    .eq('user_id', req.userId!)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json((data ?? []).map(mapSession))
})

sessionsRouter.get('/:id', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('training_sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single()

  if (error || !data) { res.status(404).json({ error: 'Séance introuvable' }); return }

  let exercises: unknown[] = []
  if (Array.isArray(data.exercises) && data.exercises.length > 0) {
    exercises = data.exercises
  } else {
    exercises = parseExercisesFromDescription(data.description ?? '', data.sport)
  }

  res.json({
    ...mapSession(data),
    exercises,
    isAmrap: data.sport === 'CrossFit' || (data.title?.toLowerCase().includes('amrap') ?? false),
    amrapDurationMin: data.duration_min ?? 20,
  })
})

const SessionLogSchema = z.object({
  durationMin: z.number().int().min(1).optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  moodStars: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  hrAvg: z.number().optional(),
  powerAvgWatts: z.number().optional(),
  pacePerKm: z.string().optional(),
  tss: z.number().optional(),
})

sessionsRouter.patch('/:id/log', async (req: AuthRequest, res) => {
  const parsed = SessionLogSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { durationMin, perceivedEffort, moodStars, notes, hrAvg, powerAvgWatts, pacePerKm, tss } = parsed.data

  const { error } = await supabaseAdmin
    .from('training_sessions')
    .update({
      duration_min: durationMin,
      perceived_effort: perceivedEffort,
      mood_stars: moodStars,
      notes,
      hr_avg: hrAvg,
      power_avg_watts: powerAvgWatts,
      pace_per_km: pacePerKm,
      tss,
      status: 'completed',
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })

  // Génération du commentaire IA en arrière-plan (non-bloquant)
  const sessionId = req.params.id
  const userId = req.userId!
  setImmediate(async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        pool.query('SELECT * FROM training_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]),
        pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
      ])
      const session = sRes.rows[0]
      const profile = pRes.rows[0]
      if (!session || !profile) return

      const gRes = await pool.query(
        'SELECT hrv_ms, body_battery_max, sleep_score, acute_load, chronic_load FROM garmin_data_daily WHERE user_id = $1 AND date = $2',
        [userId, session.date],
      )
      const g = gRes.rows[0] || {}

      const comment = await generateSessionComment({
        session: {
          title: session.title,
          sport: session.sport,
          date: session.date,
          durationMin: session.duration_min,
          hrAvg: session.hr_avg,
          powerAvgWatts: session.power_avg_watts,
          pacePerKm: session.pace_per_km,
          perceivedEffort: session.perceived_effort,
          moodStars: session.mood_stars,
          notes: session.notes,
          tss: session.tss,
          distanceMeters: session.distance_meters,
          source: session.source || 'plan',
        },
        garminContext: {
          hrv: g.hrv_ms != null ? Math.round(Number(g.hrv_ms)) : null,
          bodyBattery: g.body_battery_max ?? null,
          sleepScore: g.sleep_score ?? null,
          acuteLoad: g.acute_load != null ? Number(g.acute_load) : null,
          chronicLoad: g.chronic_load != null ? Number(g.chronic_load) : null,
        },
        profile: {
          firstName: profile.first_name || 'Athlète',
          sports: profile.sports || [],
          level: profile.level || 'intermediate',
          goals: profile.goals || [],
          ftpWatts: profile.ftp_watts,
          vo2max: profile.vo2max,
        },
      })

      await pool.query(
        'UPDATE training_sessions SET ai_comment = $1, ai_comment_generated_at = NOW() WHERE id = $2',
        [comment, sessionId],
      )
    } catch (err) {
      console.error('Session comment generation failed:', (err as Error).message)
    }
  })
})

const MoveSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
})

sessionsRouter.patch('/:id/move', async (req: AuthRequest, res) => {
  const parsed = MoveSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { error } = await supabaseAdmin
    .from('training_sessions')
    .update({ date: parsed.data.newDate })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})

const SetsSchema = z.array(z.object({
  sessionId: z.string().uuid(),
  exerciseName: z.string(),
  setNumber: z.number().int(),
  weightKg: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  durationSec: z.number().nullable().optional(),
}))

sessionsRouter.post('/sets', async (req: AuthRequest, res) => {
  const parsed = SetsSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const rows = parsed.data.map(s => ({
    user_id: req.userId!,
    session_id: s.sessionId,
    exercise_name: s.exerciseName,
    set_number: s.setNumber,
    weight_kg: s.weightKg ?? null,
    reps: s.reps ?? null,
    duration_sec: s.durationSec ?? null,
  }))

  const { error } = await supabaseAdmin.from('sets_history').insert(rows)
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})

function mapSession(data: Record<string, unknown>) {
  return {
    id: data.id,
    date: data.date,
    sport: data.sport,
    title: data.title,
    description: data.description,
    durationMin: data.duration_min,
    perceivedEffort: data.perceived_effort,
    moodStars: data.mood_stars,
    hrAvg: data.hr_avg,
    powerAvgWatts: data.power_avg_watts,
    pacePerKm: data.pace_per_km,
    tss: data.tss,
    notes: data.notes,
    status: data.status,
    source: data.source ?? 'plan',
    distanceMeters: data.distance_meters ?? null,
    aiComment: data.ai_comment ?? null,
    aiCommentGeneratedAt: data.ai_comment_generated_at ?? null,
  }
}

function parseExercisesFromDescription(desc: string, sport: string) {
  if (!desc) return defaultExercises(sport)
  return [{ name: desc, sets: 3, reps: '10', rest: 90 }]
}

function defaultExercises(sport: string) {
  if (sport === 'Musculation') {
    return [
      { name: 'Échauffement', sets: 1, reps: '5 min', rest: 0 },
      { name: 'Exercice principal', sets: 3, reps: '8-10', rest: 120 },
    ]
  }
  return [{ name: 'Séance complète', sets: 1, reps: 'Voir description', rest: 0 }]
}
