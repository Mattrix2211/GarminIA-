import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

export async function generateWeeklySummary(userId: string, weekStart: string): Promise<string> {
  const weekEnd = addDays(weekStart, 6)

  const [profileResult, sessionsResult, garminResult, weightResult] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabaseAdmin
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabaseAdmin
      .from('garmin_data_daily')
      .select('hrv_ms, body_battery_max, sleep_score, acute_load, chronic_load')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabaseAdmin
      .from('weight_history')
      .select('weight_kg')
      .eq('user_id', userId)
      .gte('week_start_date', addDays(weekStart, -7))
      .order('week_start_date', { ascending: false })
      .limit(2),
  ])

  const profile = profileResult.data
  const sessions = sessionsResult.data ?? []
  const garmin = garminResult.data ?? []
  const weights = weightResult.data ?? []

  if (!profile) throw new Error('Profil introuvable')

  const completed = sessions.filter(s => s.status === 'completed')
  const avgMood = completed.filter(s => s.mood_stars).length
    ? completed.reduce((s, c) => s + (c.mood_stars ?? 0), 0) / completed.filter(s => s.mood_stars).length
    : null
  const totalDuration = completed.reduce((s, c) => s + (c.duration_min ?? 0), 0)
  const avgHrv = garmin.filter(d => d.hrv_ms).length
    ? garmin.reduce((s, d) => s + (d.hrv_ms ?? 0), 0) / garmin.filter(d => d.hrv_ms).length
    : null

  const prompt = `Tu es le coach de ${profile.first_name}. Génère le bilan de la semaine du ${formatDate(weekStart)} au ${formatDate(weekEnd)}.

Données de la semaine :
- Séances réalisées : ${completed.length} / ${sessions.length} prévues
- Sports pratiqués : ${[...new Set(completed.map(s => s.sport))].join(', ') || 'aucun'}
- Durée totale : ${totalDuration} min
- Ressenti moyen : ${avgMood ? `${avgMood.toFixed(1)}/5` : 'non renseigné'}
- HRV moyenne : ${avgHrv ? `${avgHrv.toFixed(0)}ms` : 'non disponible'}
${weights[0] ? `- Poids : ${weights[0].weight_kg}kg${weights[1] ? ` (${weights[0].weight_kg < weights[1].weight_kg ? '-' : '+'}${Math.abs(weights[0].weight_kg - weights[1].weight_kg).toFixed(1)}kg)` : ''}` : ''}
${sessions.filter(s => s.notes).map(s => `- Note séance : "${s.notes}"`).join('\n')}

Rédige un bilan personnalisé en 4 parties :
1. **Résumé** (1-2 phrases) : ce qui s'est passé cette semaine
2. **Points positifs** (1-2 bullet points)
3. **Point d'attention** (1 point si pertinent, sinon omets cette section)
4. **Plan semaine prochaine** (1-2 phrases d'orientation générale)

Sois direct, factuel, motivant. Utilise les vrais chiffres. Adapte ton ton au niveau ${profile.level}.`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = (message.content[0] as { type: string; text: string }).text

  await supabaseAdmin.from('weekly_summaries').upsert({
    user_id: userId,
    week_start_date: weekStart,
    content,
    sessions_count: completed.length,
    tss_total: completed.reduce((s, c) => s + (c.tss ?? 0), 0) || null,
  }, { onConflict: 'user_id,week_start_date' })

  return content
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
