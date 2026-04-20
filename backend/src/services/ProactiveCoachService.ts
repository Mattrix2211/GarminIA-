import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

interface Alert {
  type: 'hrv_low_streak' | 'no_rest_streak' | 'load_ratio_high' | 'ftp_progress' | 'resting_hr_drop'
  data: Record<string, unknown>
}

export async function checkAndGenerateProactiveAlerts(userId: string): Promise<void> {
  const [profileResult, garminResult, sessionsResult] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabaseAdmin
      .from('garmin_data_daily')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(28),
    supabaseAdmin
      .from('training_sessions')
      .select('date, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(10),
  ])

  const profile = profileResult.data
  const garmin = garminResult.data ?? []
  const sessions = sessionsResult.data ?? []

  if (!profile) return

  const alerts: Alert[] = []
  const today = new Date().toISOString().split('T')[0]

  // 1. HRV basse 3 jours consécutifs
  const last3 = garmin.slice(0, 3)
  if (last3.length === 3 && last3.every(d => d.hrv_ms && d.hrv_ms < 40)) {
    alerts.push({ type: 'hrv_low_streak', data: { avgHrv: Math.round(last3.reduce((s, d) => s + (d.hrv_ms ?? 0), 0) / 3) } })
  }

  // 2. 5 jours consécutifs sans repos
  const consecutiveTraining = countConsecutiveDays(sessions.map(s => s.date))
  if (consecutiveTraining >= 5) {
    alerts.push({ type: 'no_rest_streak', data: { days: consecutiveTraining } })
  }

  // 3. Ratio charge > 1.5
  const latest = garmin[0]
  if (latest?.acute_load && latest?.chronic_load) {
    const ratio = latest.acute_load / latest.chronic_load
    if (ratio > 1.5) {
      alerts.push({ type: 'load_ratio_high', data: { ratio: ratio.toFixed(2), acute: latest.acute_load, chronic: latest.chronic_load } })
    }
  }

  // 4. FC repos en baisse sur 30 jours (signe de progression aérobie)
  const withHr = garmin.filter(d => d.resting_hr).slice(0, 30)
  if (withHr.length >= 14) {
    const recent = withHr.slice(0, 7).reduce((s, d) => s + (d.resting_hr ?? 0), 0) / 7
    const old = withHr.slice(7, 14).reduce((s, d) => s + (d.resting_hr ?? 0), 0) / 7
    if (old - recent >= 3) {
      alerts.push({ type: 'resting_hr_drop', data: { drop: Math.round(old - recent), current: Math.round(recent) } })
    }
  }

  if (alerts.length === 0) return

  // Vérifier qu'on n'a pas déjà envoyé une alerte aujourd'hui
  const { data: existing } = await supabaseAdmin
    .from('ai_recommendations')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('type', 'proactive')
    .limit(1)

  if (existing && existing.length > 0) return

  // Générer le message proactif
  const alertDescriptions = alerts.map(a => {
    switch (a.type) {
      case 'hrv_low_streak': return `HRV basse depuis 3 jours consécutifs (moy. ${a.data.avgHrv}ms)`
      case 'no_rest_streak': return `${a.data.days} jours d'entraînement consécutifs sans repos`
      case 'load_ratio_high': return `Ratio charge aiguë/chronique à ${a.data.ratio} (risque blessure)`
      case 'resting_hr_drop': return `FC de repos a baissé de ${a.data.drop}bpm ce mois-ci (signe positif)`
      default: return ''
    }
  }).join('\n')

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Tu es le coach de ${profile.first_name}. Voici ce que tu as détecté dans ses données :

${alertDescriptions}

Rédige un message proactif court (2-3 phrases max) en français. Sois direct, factuel et bienveillant. Pas de formule de politesse. Si c'est positif, félicite-le. Si c'est un risque, sois clair mais rassurant.`,
    }],
  })

  const content = (message.content[0] as { type: string; text: string }).text

  await supabaseAdmin.from('ai_recommendations').insert({
    user_id: userId,
    date: today,
    type: 'proactive',
    content,
    data_snapshot: { alerts },
  })
}

function countConsecutiveDays(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  let count = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) count++
    else break
  }
  return count
}
