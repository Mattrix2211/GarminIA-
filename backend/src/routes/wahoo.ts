import { Router } from 'express'
import { WahooService } from '../services/WahooService'

export const wahooRouter = Router()

wahooRouter.get('/status', async (req, res) => {
  const userId = (req as any).userId
  try {
    await WahooService.refreshIfNeeded(userId)
    res.json({ connected: true })
  } catch {
    res.json({ connected: false })
  }
})

wahooRouter.get('/oauth/start', (req, res) => {
  const userId = (req as any).userId
  const url = WahooService.getAuthUrl(userId)
  res.json({ authorizeUrl: url })
})

wahooRouter.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query as { code: string; state: string }
  try {
    await WahooService.exchangeCode(code, userId)
    res.redirect(`${process.env.FRONTEND_URL}/?wahoo=connected`)
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/?wahoo=error`)
  }
})

wahooRouter.post('/sync', async (req, res) => {
  const userId = (req as any).userId
  try {
    const result = await WahooService.syncWorkouts(userId)
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
