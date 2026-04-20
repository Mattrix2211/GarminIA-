import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

export const garminRouter = Router()

const GarminDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hrv_ms: z.number().nullable().optional(),
  body_battery_max: z.number().nullable().optional(),
  body_battery_min: z.number().nullable().optional(),
  sleep_score: z.number().nullable().optional(),
  sleep_duration_min: z.number().nullable().optional(),
  sleep_deep_min: z.number().nullable().optional(),
  sleep_rem_min: z.number().nullable().optional(),
  sleep_light_min: z.number().nullable().optional(),
  sleep_awake_min: z.number().nullable().optional(),
  resting_hr: z.number().nullable().optional(),
  stress_avg: z.number().nullable().optional(),
  acute_load: z.number().nullable().optional(),
  chronic_load: z.number().nullable().optional(),
  recovery_time_hours: z.number().nullable().optional(),
  training_status: z.string().nullable().optional(),
})

garminRouter.post('/sync', async (req: AuthRequest, res) => {
  const parsed = GarminDailySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { error } = await supabaseAdmin.from('garmin_data_daily').upsert(
    { user_id: req.userId!, ...parsed.data },
    { onConflict: 'user_id,date' },
  )

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ ok: true })
})

garminRouter.get('/history', async (req: AuthRequest, res) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 90)
  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabaseAdmin
    .from('garmin_data_daily')
    .select('*')
    .eq('user_id', req.userId!)
    .gte('date', from.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json(data)
})
