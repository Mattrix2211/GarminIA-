import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { checkAndGenerateProactiveAlerts } from '../services/ProactiveCoachService'
import { generateWeeklySummary } from '../services/WeeklySummaryService'

export const coachRouter = Router()

// Récupérer les conseils proactifs récents
coachRouter.get('/proactive', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('ai_recommendations')
    .select('id, date, type, content, created_at')
    .eq('user_id', req.userId!)
    .in('type', ['proactive', 'morning'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// Déclencher l'analyse proactive manuellement (ou via cron)
coachRouter.post('/analyze', async (req: AuthRequest, res) => {
  try {
    await checkAndGenerateProactiveAlerts(req.userId!)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Résumés hebdomadaires
coachRouter.get('/weekly-summary', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('weekly_summaries')
    .select('*')
    .eq('user_id', req.userId!)
    .order('week_start_date', { ascending: false })
    .limit(8)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

const SummarySchema = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

coachRouter.post('/weekly-summary/generate', async (req: AuthRequest, res) => {
  const parsed = SummarySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  try {
    const content = await generateWeeklySummary(req.userId!, parsed.data.weekStart)
    res.json({ ok: true, content })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
