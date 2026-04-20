import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import {
  getRequestToken,
  exchangeForAccessToken,
  saveGarminTokens,
  getGarminTokens,
} from '../services/GarminOAuthService'
import { fetchDailyWellness } from '../services/GarminApiService'

export const garminRouter = Router()

// Étape 1 : initier l'OAuth — renvoie l'URL d'autorisation Garmin
garminRouter.get('/oauth/start', async (req: AuthRequest, res) => {
  try {
    const { token, tokenSecret, authorizeUrl } = await getRequestToken()

    await supabaseAdmin.from('oauth_state').insert({
      user_id: req.userId!,
      provider: 'garmin',
      oauth_token: token,
      oauth_token_secret: tokenSecret,
    })

    res.json({ authorizeUrl })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Étape 2 : callback après autorisation Garmin
const CallbackSchema = z.object({
  oauth_token: z.string(),
  oauth_verifier: z.string(),
})

garminRouter.post('/oauth/callback', async (req: AuthRequest, res) => {
  const parsed = CallbackSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { oauth_token, oauth_verifier } = parsed.data

  const { data: stateRow } = await supabaseAdmin
    .from('oauth_state')
    .select('oauth_token_secret, user_id')
    .eq('oauth_token', oauth_token)
    .eq('user_id', req.userId!)
    .single()

  if (!stateRow) {
    res.status(400).json({ error: 'État OAuth invalide ou expiré' })
    return
  }

  try {
    const tokens = await exchangeForAccessToken(oauth_token, oauth_verifier, stateRow.oauth_token_secret)
    await saveGarminTokens(req.userId!, tokens)

    await supabaseAdmin.from('oauth_state').delete().eq('oauth_token', oauth_token)

    // Sync immédiate des données du jour
    const today = new Date().toISOString().split('T')[0]
    await syncDayForUser(req.userId!, today)

    res.json({ ok: true, connected: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Sync manuelle d'une date
garminRouter.post('/sync', async (req: AuthRequest, res) => {
  const date = (req.body.date as string) || new Date().toISOString().split('T')[0]
  try {
    await syncDayForUser(req.userId!, date)
    res.json({ ok: true })
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

// Endpoint manuel pour injecter des données (dev / saisie manuelle)
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

async function syncDayForUser(userId: string, date: string): Promise<void> {
  const tokens = await getGarminTokens(userId)
  if (!tokens) return

  const wellness = await fetchDailyWellness(tokens.accessToken, tokens.accessTokenSecret, date)

  await supabaseAdmin.from('garmin_data_daily').upsert(
    { user_id: userId, ...wellness },
    { onConflict: 'user_id,date' },
  )

  await supabaseAdmin
    .from('user_devices')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', 'garmin')
}
