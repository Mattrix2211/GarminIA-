import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { authMiddleware } from './middleware/auth'
import { profileRouter } from './routes/profile'
import { dashboardRouter } from './routes/dashboard'
import { chatRouter } from './routes/chat'
import { garminRouter } from './routes/garmin'
import { sessionsRouter } from './routes/sessions'
import { plansRouter } from './routes/plans'
import { statsRouter } from './routes/stats'
import { coachRouter } from './routes/coach'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60_000, max: 100 }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api', authMiddleware)
app.use('/api/profile', profileRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/chat', chatRouter)
app.use('/api/garmin', garminRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/plans', plansRouter)
app.use('/api/stats', statsRouter)
app.use('/api/coach', coachRouter)

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})
