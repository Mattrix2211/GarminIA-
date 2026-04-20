import { Router } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { streamChat } from '../services/AnthropicService'
import { supabaseAdmin } from '../lib/supabase'

export const chatRouter = Router()

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).default([]),
})

chatRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = ChatSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const userId = req.userId!
  const { message, history } = parsed.data

  const [profileResult, todayResult] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabaseAdmin
      .from('garmin_data_daily')
      .select('*')
      .eq('user_id', userId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single(),
  ])

  const profile = profileResult.data
  const today = todayResult.data

  const userCtx = {
    firstName: profile?.first_name ?? 'Athlète',
    sports: profile?.sports ?? [],
    level: profile?.level ?? 'intermediate',
    goals: profile?.goals ?? [],
    todayData: {
      hrv: today?.hrv_ms ?? null,
      bodyBattery: today?.body_battery_max ?? null,
      sleepScore: today?.sleep_score ?? null,
      restingHr: today?.resting_hr ?? null,
      acuteLoad: today?.acute_load ?? null,
      chronicLoad: today?.chronic_load ?? null,
      recoveryTimeHours: today?.recovery_time_hours ?? null,
    },
  }

  const messages = [
    ...history,
    { role: 'user' as const, content: message },
  ]

  await streamChat(messages, userCtx, res)
})
