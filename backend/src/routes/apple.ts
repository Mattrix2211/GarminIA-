import { Router } from 'express'
import { AppleHealthService, type AppleWorkoutPayload } from '../services/AppleHealthService'

export const appleRouter = Router()

appleRouter.get('/status', async (req, res) => {
  const userId = (req as any).userId
  const status = await AppleHealthService.getStatus(userId)
  res.json(status)
})

// Import depuis un Shortcut iOS ou un export JSON Apple Health
appleRouter.post('/sync', async (req, res) => {
  const userId = (req as any).userId
  const workouts: AppleWorkoutPayload[] = req.body.workouts ?? []

  if (!Array.isArray(workouts)) {
    return res.status(400).json({ error: 'workouts doit être un tableau' })
  }

  try {
    const result = await AppleHealthService.importWorkouts(userId, workouts)
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
