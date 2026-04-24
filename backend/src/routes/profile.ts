import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

export const profileRouter = Router()

const ProfileSchema = z.object({
  firstName: z.string().min(1),
  age: z.number().int().min(10).max(100).nullable().optional(),
  weightKg: z.number().min(20).max(300).nullable().optional(),
  heightCm: z.number().min(100).max(250).nullable().optional(),
  sports: z.array(z.string()).default([]),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'competitor']).optional(),
  goals: z.array(z.string()).default([]),
  targetCompetitionDate: z.string().nullable().optional(),
  devices: z.array(z.string()).default([]),
})

profileRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = ProfileSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { firstName, age, weightKg, heightCm, sports, level, goals, targetCompetitionDate, devices } = parsed.data

  const { error } = await supabaseAdmin.from('user_profiles').upsert({
    user_id: req.userId!,
    first_name: firstName,
    age: age ?? null,
    weight_kg: weightKg ?? null,
    height_cm: heightCm ?? null,
    sports: sports ?? [],
    level: level ?? null,
    goals: goals ?? [],
    target_competition_date: targetCompetitionDate ?? null,
    equipment: devices ?? [],
    onboarding_completed: true,
    available_days: [1, 2, 3, 4, 5],
    max_session_duration_min: 90,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})

profileRouter.get('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.userId!)
    .single()

  if (error) { res.status(404).json({ error: 'Profil non trouvé' }); return }
  res.json(data)
})

// Poids hebdomadaire
const WeightSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().min(20).max(300),
})

profileRouter.post('/weight', async (req: AuthRequest, res) => {
  const parsed = WeightSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { error } = await supabaseAdmin.from('weight_history').upsert({
    user_id: req.userId!,
    week_start_date: parsed.data.weekStartDate,
    weight_kg: parsed.data.weightKg,
  }, { onConflict: 'user_id,week_start_date' })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})

profileRouter.get('/weight', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('weight_history')
    .select('week_start_date, weight_kg')
    .eq('user_id', req.userId!)
    .order('week_start_date', { ascending: false })
    .limit(12)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json((data ?? []).map(w => ({ weekStartDate: w.week_start_date, weightKg: w.weight_kg })))
})

profileRouter.patch('/preferences', async (req: AuthRequest, res) => {
  const parsed = z.object({
    availableDays: z.array(z.number().int().min(0).max(6)).optional(),
    maxSessionDurationMin: z.number().int().min(15).max(300).optional(),
    ftpWatts: z.number().int().optional(),
    vo2max: z.number().optional(),
    restingHr: z.number().int().optional(),
  }).safeParse(req.body)

  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const updates: Record<string, unknown> = {}
  if (parsed.data.availableDays) updates.available_days = parsed.data.availableDays
  if (parsed.data.maxSessionDurationMin) updates.max_session_duration_min = parsed.data.maxSessionDurationMin
  if (parsed.data.ftpWatts) updates.ftp_watts = parsed.data.ftpWatts
  if (parsed.data.vo2max) updates.vo2max = parsed.data.vo2max
  if (parsed.data.restingHr) updates.resting_hr = parsed.data.restingHr

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('user_id', req.userId!)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})
