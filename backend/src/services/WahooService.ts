import { supabaseAdmin } from '../db/supabase'
import type { NormalizedActivity } from './ActivityDeduplicator'

const WAHOO_API = 'https://api.wahooligan.com'

export class WahooService {
  static getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: process.env.WAHOO_CLIENT_ID ?? '',
      redirect_uri: `${process.env.BACKEND_URL}/api/wahoo/callback`,
      response_type: 'code',
      scope: 'workouts_read user_read',
      state: userId,
    })
    return `${WAHOO_API}/oauth/authorize?${params}`
  }

  static async exchangeCode(code: string, userId: string): Promise<void> {
    const res = await fetch(`${WAHOO_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.WAHOO_CLIENT_ID,
        client_secret: process.env.WAHOO_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BACKEND_URL}/api/wahoo/callback`,
      }),
    })
    if (!res.ok) throw new Error(`Wahoo OAuth failed: ${await res.text()}`)
    const { access_token, refresh_token, expires_in } = await res.json()

    await supabaseAdmin.from('user_devices').upsert({
      user_id: userId,
      provider: 'wahoo',
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    }, { onConflict: 'user_id,provider' })
  }

  static async refreshIfNeeded(userId: string): Promise<string> {
    const { data: device } = await supabaseAdmin
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'wahoo')
      .single()

    if (!device) throw new Error('Wahoo not connected')

    const expiry = new Date(device.token_expires_at).getTime()
    if (expiry - Date.now() > 5 * 60 * 1000) return device.access_token

    const res = await fetch(`${WAHOO_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.WAHOO_CLIENT_ID,
        client_secret: process.env.WAHOO_CLIENT_SECRET,
        refresh_token: device.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const { access_token, refresh_token, expires_in } = await res.json()
    await supabaseAdmin.from('user_devices').update({
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    }).eq('user_id', userId).eq('provider', 'wahoo')

    return access_token
  }

  static async getWorkouts(userId: string, since?: string): Promise<NormalizedActivity[]> {
    const token = await this.refreshIfNeeded(userId)
    const params = new URLSearchParams({ page: '1', per_page: '50' })
    if (since) params.set('updated_after', since)

    const res = await fetch(`${WAHOO_API}/v1/workouts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Wahoo API error: ${res.status}`)
    const { workouts } = await res.json()

    return (workouts ?? []).map((w: any) => normalizeWahooWorkout(w))
  }

  static async syncWorkouts(userId: string): Promise<{ imported: number; duplicates: number }> {
    const workouts = await this.getWorkouts(userId)
    if (!workouts.length) return { imported: 0, duplicates: 0 }

    const { data: existing } = await supabaseAdmin
      .from('synced_activities')
      .select('external_id, source')
      .eq('user_id', userId)

    const existingIds = new Set(existing?.map(e => `${e.source}:${e.external_id}`) ?? [])
    const toInsert = workouts.filter(w => !existingIds.has(`wahoo:${w.externalId}`))

    if (toInsert.length > 0) {
      await supabaseAdmin.from('synced_activities').insert(
        toInsert.map(w => ({
          user_id: userId,
          source: 'wahoo',
          external_id: w.externalId,
          sport: w.sport,
          date: w.date,
          start_time: w.startTime,
          duration_min: w.durationMin,
          hr_avg: w.hrAvg,
          power_avg_watts: w.powerAvgWatts,
          distance_m: w.distanceM,
          calories: w.calories,
          dedup_fingerprint: `${w.sport}|${w.date}|${Math.round(w.durationMin / 5) * 5}`,
        }))
      )
    }

    return { imported: toInsert.length, duplicates: workouts.length - toInsert.length }
  }
}

function normalizeWahooWorkout(w: any): NormalizedActivity {
  const start = new Date(w.starts)
  return {
    externalId: String(w.id),
    source: 'wahoo',
    sport: wahooSportMap(w.workout_type?.name ?? ''),
    date: start.toISOString().split('T')[0],
    startTime: start.toISOString(),
    durationMin: Math.round((w.minutes ?? 0)),
    hrAvg: w.heart_rate_avg ?? null,
    powerAvgWatts: w.power_avg ?? null,
    distanceM: w.distance_accum ? w.distance_accum * 1000 : null,
    calories: w.calories_accum ?? null,
    raw: w,
  }
}

function wahooSportMap(type: string): string {
  const map: Record<string, string> = {
    'Cycling': 'Cyclisme', 'Running': 'Course à pied', 'Swimming': 'Natation',
    'Strength Training': 'Musculation', 'HIIT': 'CrossFit', 'Rowing': 'Aviron',
    'Trail Running': 'Trail', 'Triathlon': 'Triathlon',
  }
  return map[type] ?? type
}
