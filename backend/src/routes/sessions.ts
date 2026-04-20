import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

export const sessionsRouter = Router()

const SessionLogSchema = z.object({
  sessionId: z.string().uuid(),
  duration_min: z.number().int().min(1).optional(),
  perceived_effort: z.number().int().min(1).max(10).optional(),
  mood_stars: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  hr_avg: z.number().optional(),
  power_avg_watts: z.number().optional(),
  pace_per_km: z.string().optional(),
  tss: z.number().optional(),
})

sessionsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

  const { data, error } = await supabaseAdmin
    .from('training_sessions')
    .select('*')
    .eq('user_id', req.userId!)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json(data)
})

sessionsRouter.patch('/:id/log', async (req: AuthRequest, res) => {
  const parsed = SessionLogSchema.safeParse({ sessionId: req.params.id, ...req.body })
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { sessionId, ...fields } = parsed.data

  const { error } = await supabaseAdmin
    .from('training_sessions')
    .update({ ...fields, status: 'completed' })
    .eq('id', sessionId)
    .eq('user_id', req.userId!)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ ok: true })
})
