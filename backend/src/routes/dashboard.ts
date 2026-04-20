import { Router } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { generateMorningRecommendation } from '../services/AnthropicService'

export const dashboardRouter = Router()

dashboardRouter.get('/today', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const today = new Date().toISOString().split('T')[0]

  const [profileResult, garminResult, existingRecResult] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabaseAdmin.from('garmin_data_daily').select('*').eq('user_id', userId).eq('date', today).single(),
    supabaseAdmin
      .from('ai_recommendations')
      .select('content')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('type', 'morning')
      .single(),
  ])

  const garmin = garminResult.data
  const profile = profileResult.data

  let aiRecommendation = existingRecResult.data?.content ?? null

  if (!aiRecommendation && garmin && profile) {
    const userCtx = {
      firstName: profile.first_name,
      sports: profile.sports,
      level: profile.level,
      goals: profile.goals,
      todayData: {
        hrv: garmin.hrv_ms,
        bodyBattery: garmin.body_battery_max,
        sleepScore: garmin.sleep_score,
        restingHr: garmin.resting_hr,
        acuteLoad: garmin.acute_load,
        chronicLoad: garmin.chronic_load,
        recoveryTimeHours: garmin.recovery_time_hours,
      },
    }
    aiRecommendation = await generateMorningRecommendation(userCtx)

    await supabaseAdmin.from('ai_recommendations').insert({
      user_id: userId,
      date: today,
      type: 'morning',
      content: aiRecommendation,
      data_snapshot: garmin,
    })
  }

  res.json({
    hrv: garmin?.hrv_ms ?? null,
    bodyBattery: garmin?.body_battery_max ?? null,
    sleepScore: garmin?.sleep_score ?? null,
    restingHr: garmin?.resting_hr ?? null,
    recoveryTimeHours: garmin?.recovery_time_hours ?? null,
    acuteLoad: garmin?.acute_load ?? null,
    chronicLoad: garmin?.chronic_load ?? null,
    aiRecommendation,
  })
})
