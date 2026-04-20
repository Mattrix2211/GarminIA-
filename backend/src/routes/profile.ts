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
  sports: z.array(z.string()).min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'competitor']),
  goals: z.array(z.string()),
  targetCompetitionDate: z.string().nullable().optional(),
  devices: z.array(z.string()),
})

profileRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = ProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { firstName, age, weightKg, heightCm, sports, level, goals, targetCompetitionDate, devices } = parsed.data
  const userId = req.userId!

  const { error } = await supabaseAdmin.from('user_profiles').upsert({
    user_id: userId,
    first_name: firstName,
    age: age ?? null,
    weight_kg: weightKg ?? null,
    height_cm: heightCm ?? null,
    sports,
    level,
    goals,
    target_competition_date: targetCompetitionDate ?? null,
    equipment: devices,
    onboarding_completed: true,
    available_days: [1, 2, 3, 4, 5],
    max_session_duration_min: 90,
  }, { onConflict: 'user_id' })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ ok: true })
})

profileRouter.get('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.userId!)
    .single()

  if (error) {
    res.status(404).json({ error: 'Profil non trouvé' })
    return
  }

  res.json(data)
})
