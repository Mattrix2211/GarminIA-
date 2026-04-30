import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

export const calendarRouter = Router()

const MonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM requis')

// GET /api/calendar/sessions?month=YYYY-MM
calendarRouter.get('/sessions', async (req: AuthRequest, res) => {
  const parsed = MonthSchema.safeParse(req.query.month)
  if (!parsed.success) { res.status(400).json({ error: 'Paramètre month requis (YYYY-MM)' }); return }

  const month = parsed.data
  const [y, m] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = new Date(y, m, 0).toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('training_sessions')
    .select('id, date, sport, title, duration_min, status, tss')
    .eq('user_id', req.userId!)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) { res.status(500).json({ error: error.message }); return }

  res.json((data ?? []).map(s => ({
    id: s.id,
    date: s.date,
    sport: s.sport,
    title: s.title,
    durationMin: s.duration_min,
    status: s.status,
    tss: s.tss ?? null,
  })))
})

// GET /api/calendar/hrv?month=YYYY-MM
calendarRouter.get('/hrv', async (req: AuthRequest, res) => {
  const parsed = MonthSchema.safeParse(req.query.month)
  if (!parsed.success) { res.status(400).json({ error: 'Paramètre month requis (YYYY-MM)' }); return }

  const month = parsed.data
  const [y, m] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = new Date(y, m, 0).toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('garmin_data_daily')
    .select('date, hrv_ms')
    .eq('user_id', req.userId!)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) { res.status(500).json({ error: error.message }); return }

  const hrvMap: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.hrv_ms != null) hrvMap[row.date] = Number(row.hrv_ms)
  }
  res.json(hrvMap)
})
