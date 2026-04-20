import { Router } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

export const statsRouter = Router()

statsRouter.get('/weekly', async (req: AuthRequest, res) => {
  const weeks = parseInt(req.query.weeks as string) || 8
  const from = new Date()
  from.setDate(from.getDate() - weeks * 7)

  const { data, error } = await supabaseAdmin
    .from('training_sessions')
    .select('date, status, mood_stars, duration_min, tss')
    .eq('user_id', req.userId!)
    .gte('date', from.toISOString().split('T')[0])
    .order('date')

  if (error) { res.status(500).json({ error: error.message }); return }

  const byWeek: Record<string, { sessions: typeof data }> = {}

  for (const s of data ?? []) {
    const monday = getMonday(s.date)
    if (!byWeek[monday]) byWeek[monday] = { sessions: [] }
    byWeek[monday].sessions.push(s)
  }

  const result = Object.entries(byWeek).map(([weekStart, { sessions }]) => {
    const completed = sessions.filter(s => s.status === 'completed')
    const moods = completed.map(s => s.mood_stars).filter(Boolean) as number[]
    return {
      weekStart,
      sessionsCount: completed.length,
      avgMood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
      totalDurationMin: completed.reduce((sum, s) => sum + (s.duration_min ?? 0), 0),
      tssTotal: completed.reduce((sum, s) => sum + (s.tss ?? 0), 0) || null,
    }
  })

  res.json(result)
})

statsRouter.get('/exercises', async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('sets_history')
    .select('exercise_name, weight_kg, reps, created_at')
    .eq('user_id', req.userId!)
    .order('created_at')

  if (error) { res.status(500).json({ error: error.message }); return }

  const byExercise: Record<string, { date: string; maxKg: number; totalVolume: number }[]> = {}

  for (const row of data ?? []) {
    const name = row.exercise_name
    const date = row.created_at.split('T')[0]
    const kg = row.weight_kg ?? 0
    const reps = row.reps ?? 0

    if (!byExercise[name]) byExercise[name] = []
    const existing = byExercise[name].find(e => e.date === date)
    if (existing) {
      existing.maxKg = Math.max(existing.maxKg, kg)
      existing.totalVolume += kg * reps
    } else {
      byExercise[name].push({ date, maxKg: kg, totalVolume: kg * reps })
    }
  }

  const result = Object.entries(byExercise)
    .map(([exerciseName, entries]) => ({ exerciseName, entries }))
    .sort((a, b) => b.entries.length - a.entries.length)

  res.json(result)
})

function getMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  return mon.toISOString().split('T')[0]
}
