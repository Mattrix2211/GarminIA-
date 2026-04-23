import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { authMiddleware } from './middleware/auth'
import { authRouter } from './routes/auth'
import { profileRouter } from './routes/profile'
import { dashboardRouter } from './routes/dashboard'
import { chatRouter } from './routes/chat'
import { garminRouter } from './routes/garmin'
import { sessionsRouter } from './routes/sessions'
import { plansRouter } from './routes/plans'
import { statsRouter } from './routes/stats'
import { coachRouter } from './routes/coach'
import { pushRouter } from './routes/push'
import { wahooRouter } from './routes/wahoo'
import { appleRouter } from './routes/apple'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(rateLimit({ windowMs: 60_000, max: 100 }))

app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes publiques (avant authMiddleware)
app.use('/api/auth', authRouter)

// Routes protégées
app.use('/api', authMiddleware)
app.use('/api/profile', profileRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/chat', chatRouter)
app.use('/api/garmin', garminRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/plans', plansRouter)
app.use('/api/stats', statsRouter)
app.use('/api/coach', coachRouter)
app.use('/api/push', pushRouter)
app.use('/api/wahoo', wahooRouter)
app.use('/api/apple', appleRouter)

// Garmin OAuth callback (redirection publique)
app.get('/api/garmin/oauth/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query
  res.redirect(
    `${process.env.FRONTEND_URL}/garmin/callback?code=${oauth_token}&state=${oauth_verifier}`
  )
})

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})
