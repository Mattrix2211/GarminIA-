import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { generateAndSavePlan } from '../services/TrainingPlanService'

export const plansRouter = Router()

plansRouter.post('/generate', async (req: AuthRequest, res) => {
  const userId = req.userId!

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!profile) { res.status(404).json({ error: 'Profil introuvable' }); return }

  const { data: latestGarmin } = await supabaseAdmin
    .from('garmin_data_daily')
    .select('acute_load, chronic_load')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const weekStart = getMonday(new Date()).toISOString().split('T')[0]

  try {
    const planId = await generateAndSavePlan({
      userId,
      firstName: profile.first_name,
      sports: profile.sports,
      level: profile.level,
      goals: profile.goals,
      availableDays: profile.available_days,
      maxSessionMin: profile.max_session_duration_min,
      equipment: profile.equipment,
      ftpWatts: profile.ftp_watts,
      vo2max: profile.vo2max,
      currentLoad: {
        acute: latestGarmin?.acute_load ?? null,
        chronic: latestGarmin?.chronic_load ?? null,
      },
      weekStartDate: weekStart,
    })

    res.json({ ok: true, planId })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

plansRouter.get('/current', async (req: AuthRequest, res) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: plan } = await supabaseAdmin
    .from('training_plans')
    .select('*, training_sessions(*)')
    .eq('user_id', req.userId!)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  res.json(plan ?? null)
})

plansRouter.get('/:id/sessions', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('training_sessions')
    .select('*')
    .eq('plan_id', req.params.id)
    .eq('user_id', req.userId!)
    .order('date')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Mise à jour des préférences horaires (jours dispo, durée max)
const PrefsSchema = z.object({
  availableDays: z.array(z.number().int().min(0).max(6)),
  maxSessionDurationMin: z.number().int().min(15).max(300),
})

plansRouter.patch('/preferences', async (req: AuthRequest, res) => {
  const parsed = PrefsSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      available_days: parsed.data.availableDays,
      max_session_duration_min: parsed.data.maxSessionDurationMin,
    })
    .eq('user_id', req.userId!)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})
