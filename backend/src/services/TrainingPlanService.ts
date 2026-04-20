import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

interface PlanRequest {
  userId: string
  firstName: string
  sports: string[]
  level: string
  goals: string[]
  availableDays: number[]
  maxSessionMin: number
  equipment: string[]
  ftpWatts: number | null
  vo2max: number | null
  currentLoad: { acute: number | null; chronic: number | null }
  weekStartDate: string
}

interface PlannedExercise {
  name: string
  sets: number
  reps: string
  rest: number
  notes?: string
}

interface PlannedSession {
  date: string
  sport: string
  title: string
  description: string
  durationMin: number
  exercises?: PlannedExercise[]
  isAmrap?: boolean
  amrapDurationMin?: number
}

export async function generateWeeklyPlan(req: PlanRequest): Promise<PlannedSession[]> {
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const availableDayNames = req.availableDays.map(d => dayNames[d]).join(', ')

  const prompt = `Tu es un coach sportif expert. Génère un plan d'entraînement pour la semaine du ${req.weekStartDate}.

Athlète : ${req.firstName}
Sports : ${req.sports.join(', ')}
Niveau : ${req.level}
Objectifs : ${req.goals.join(', ')}
Jours disponibles : ${availableDayNames}
Durée max par séance : ${req.maxSessionMin} min
Équipement : ${req.equipment.join(', ') || 'standard'}
${req.ftpWatts ? `FTP : ${req.ftpWatts}W` : ''}
${req.vo2max ? `VO2 max : ${req.vo2max}` : ''}
${req.currentLoad.acute ? `Charge aiguë actuelle : ${req.currentLoad.acute}` : ''}

Réponds UNIQUEMENT avec un JSON valide, tableau de séances. Format exact :
[
  {
    "date": "YYYY-MM-DD",
    "sport": "Cyclisme",
    "title": "Endurance fondamentale Z2",
    "description": "2h en zone 2 (140-155W). Cadence 85-90rpm. Alimentation toutes les 45min.",
    "durationMin": 120
  }
]

Règles :
- Max 1 séance intense par 48h
- Si charge aiguë élevée, prévoir plus de séances légères
- Pour Musculation/CrossFit : inclure "exercises" avec les exercices détaillés
- Pour CrossFit AMRAP : mettre isAmrap=true et amrapDurationMin
- Descriptions concrètes avec zones, allures ou charges selon le sport
- Respecter exactement les jours disponibles
- Date au format ISO YYYY-MM-DD
- Pour les séances Musculation, exemple exercises : [{"name":"Squat","sets":4,"reps":"8","rest":120},{"name":"Développé couché","sets":3,"reps":"10","rest":90}]`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Plan IA invalide : pas de JSON trouvé')

  return JSON.parse(jsonMatch[0]) as PlannedSession[]
}

export async function generateAndSavePlan(req: PlanRequest): Promise<string> {
  const sessions = await generateWeeklyPlan(req)

  const { data: plan, error: planError } = await supabaseAdmin
    .from('training_plans')
    .insert({
      user_id: req.userId,
      start_date: req.weekStartDate,
      end_date: addDays(req.weekStartDate, 6),
      sport: req.sports[0],
      goal: req.goals[0] ?? null,
      generated_by_ai: true,
    })
    .select('id')
    .single()

  if (planError || !plan) throw new Error('Impossible de créer le plan')

  const sessionRows = sessions.map(s => ({
    user_id: req.userId,
    plan_id: plan.id,
    date: s.date,
    sport: s.sport,
    title: s.title,
    description: s.description,
    exercises: s.exercises ?? [],
    duration_min: s.durationMin,
    status: 'planned' as const,
  }))

  await supabaseAdmin.from('training_sessions').insert(sessionRows)

  return plan.id
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
