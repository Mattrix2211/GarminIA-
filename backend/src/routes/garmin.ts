import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

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

// Étape 1 : démarrer la connexion Garmin (email + mdp)
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

// Étape 2 : fournir le code MFA
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

// Sync manuelle
garminRouter.post('/sync', async (req: AuthRequest, res) => {
  try {
    const data = await syncFetch(`/sync/${req.userId!}`, {})
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Statut de connexion
garminRouter.get('/status', async (req: AuthRequest, res) => {
  const { data } = await supabaseAdmin
    .from('user_devices')
    .select('connected, connected_at, last_sync_at')
    .eq('user_id', req.userId!)
    .eq('provider', 'garmin')
    .single()

  res.json({ connected: data?.connected ?? false, lastSync: data?.last_sync_at ?? null })
})

// Historique des données de récupération
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
  res.json(data)
})

// Saisie manuelle de données
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
