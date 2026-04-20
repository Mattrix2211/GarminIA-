import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

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

  // Récupérer les exercices depuis la description (JSON stocké) ou générer depuis le titre
  let exercises = []
  try {
    exercises = data.description ? JSON.parse(data.description) : []
  } catch {
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
