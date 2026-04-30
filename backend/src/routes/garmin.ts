import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { pool } from '../lib/db'
import { generateSessionComment } from '../services/AnthropicService'

export const garminRouter = Router()

const SYNC_URL = process.env.GARMIN_SYNC_URL || 'http://garmin-sync:5001'

async function syncFetch(path: string, body?: unknown) {
  const res = await fetch(`${SYNC_URL}${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  return res.json()
}

garminRouter.post('/connect/start', async (req: AuthRequest, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'email et password requis' })
    return
  }
  try {
    const data = await syncFetch('/login/start', { userId: req.userId!, email, password })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

garminRouter.post('/connect/mfa', async (req: AuthRequest, res) => {
  const { code, email } = req.body
  if (!code) { res.status(400).json({ error: 'code MFA requis' }); return }
  try {
    const data = await syncFetch('/login/mfa', { userId: req.userId!, email, code })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Sync données de récupération (wellness)
garminRouter.post('/sync', async (req: AuthRequest, res) => {
  try {
    const data = await syncFetch(`/sync/${req.userId!}`, {})
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Sync activités sportives depuis Garmin → training_sessions
garminRouter.post('/sync-activities', async (req: AuthRequest, res) => {
  const userId = req.userId!
  try {
    const data = await syncFetch(`/sync-activities/${userId}`, {}) as { error?: string; imported?: number }
    if (data.error) { res.status(500).json({ error: data.error }); return }
    res.json({ ok: true, imported: data.imported ?? 0 })

    // Générer les commentaires IA pour les activités importées sans commentaire
    setImmediate(async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          pool.query(
            `SELECT * FROM training_sessions WHERE user_id = $1 AND source = 'garmin'
             AND ai_comment IS NULL AND status = 'completed'
             ORDER BY date DESC LIMIT 5`,
            [userId],
          ),
          pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
        ])
        const profile = pRes.rows[0]
        if (!profile || sRes.rows.length === 0) return

        for (const session of sRes.rows) {
          const gRes = await pool.query(
            'SELECT hrv_ms, body_battery_max, sleep_score, acute_load, chronic_load FROM garmin_data_daily WHERE user_id = $1 AND date = $2',
            [userId, session.date],
          )
          const g = gRes.rows[0] || {}
          const comment = await generateSessionComment({
            session: {
              title: session.title, sport: session.sport, date: session.date,
              durationMin: session.duration_min, hrAvg: session.hr_avg,
              powerAvgWatts: session.power_avg_watts, tss: session.tss,
              distanceMeters: session.distance_meters, source: 'garmin',
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
            [comment, session.id],
          )
        }
      } catch (err) {
        console.error('Garmin sync AI comments failed:', (err as Error).message)
      }
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

garminRouter.get('/status', async (req: AuthRequest, res) => {
  const { data } = await supabaseAdmin
    .from('user_devices')
    .select('connected, connected_at, last_sync_at')
    .eq('user_id', req.userId!)
    .eq('provider', 'garmin')
    .single()

  res.json({ connected: data?.connected ?? false, lastSync: data?.last_sync_at ?? null })
})

const HistorySchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(30) })

garminRouter.get('/history', async (req: AuthRequest, res) => {
  const { days } = HistorySchema.parse(req.query)
  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabaseAdmin
    .from('garmin_data_daily')
    .select('*')
    .eq('user_id', req.userId!)
    .gte('date', from.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }

  // Mapper vers les champs attendus par StatsPage et DashboardPage
  res.json((data ?? []).map(d => ({
    date: d.date,
    hrv: d.hrv_ms != null ? Math.round(Number(d.hrv_ms)) : null,
    bodyBattery: d.body_battery_max ?? null,
    sleepScore: d.sleep_score ?? null,
    restingHr: d.resting_hr ?? null,
    acuteLoad: d.acute_load != null ? Number(d.acute_load) : null,
    chronicLoad: d.chronic_load != null ? Number(d.chronic_load) : null,
    recoveryTimeHours: d.recovery_time_hours ?? null,
    stressAvg: d.stress_avg ?? null,
  })))
})

const GarminDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hrv_ms: z.number().nullable().optional(),
  body_battery_max: z.number().nullable().optional(),
  body_battery_min: z.number().nullable().optional(),
  sleep_score: z.number().nullable().optional(),
  sleep_duration_min: z.number().nullable().optional(),
  resting_hr: z.number().nullable().optional(),
  stress_avg: z.number().nullable().optional(),
  acute_load: z.number().nullable().optional(),
  chronic_load: z.number().nullable().optional(),
  recovery_time_hours: z.number().nullable().optional(),
})

garminRouter.post('/manual', async (req: AuthRequest, res) => {
  const parsed = GarminDailySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { error } = await supabaseAdmin.from('garmin_data_daily').upsert(
    { user_id: req.userId!, ...parsed.data },
    { onConflict: 'user_id,date' },
  )
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})
