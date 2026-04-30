import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { rateLimit } from 'express-rate-limit'
import { pool } from '../lib/db'

export const authRouter = Router()

const BCRYPT_ROUNDS = 12
const ACCESS_TTL  = '1h'
const REFRESH_TTL = '30d'
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`)
  return v
}

function signAccess(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, requireEnv('JWT_SECRET'), { expiresIn: ACCESS_TTL })
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId }, requireEnv('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TTL })
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Rate limit strict sur les routes auth (anti-brute force)
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Trop de tentatives, réessaie dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const RegisterSchema = z.object({
  email:    z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8).max(128),
})

authRouter.post('/register', authLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }
  const { email, password } = parsed.data

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      // Même message que "mot de passe incorrect" pour éviter l'énumération d'emails
      res.status(400).json({ error: 'Email ou mot de passe invalide.' })
      return
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash],
    )
    const userId: string = result.rows[0].id

    const accessToken  = signAccess(userId, email)
    const refreshToken = signRefresh(userId)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, hashToken(refreshToken), expiresAt],
    )

    // Profil minimal — sera complété via l'onboarding
    await pool.query(
      `INSERT INTO user_profiles (user_id, first_name, sports, goals, level, available_days, max_session_duration_min, equipment)
       VALUES ($1, '', '{}', '{}', 'beginner', '{1,2,3,4,5}', 90, '{}')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    ).catch(err => console.warn('Profile init skipped:', (err as Error).message))

    res.status(201).json({ accessToken, refreshToken, user: { id: userId, email } })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Erreur interne.' })
  }
})

const LoginSchema = z.object({
  email:    z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(128),
})

authRouter.post('/login', authLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email ou mot de passe incorrect.' })
    return
  }
  const { email, password } = parsed.data

  try {
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email],
    )

    const user = result.rows[0]
    // bcrypt.compare est toujours exécuté (même si user n'existe pas) pour éviter les timing attacks
    const dummyHash = '$2b$12$DUMMY_HASH_TO_PREVENT_TIMING_ATTACKS_XXXXXXXXXXXXXXXXX'
    const valid = await bcrypt.compare(password, user?.password_hash ?? dummyHash)

    if (!user || !valid) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
      return
    }

    const accessToken  = signAccess(user.id, email)
    const refreshToken = signRefresh(user.id)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)

    // Supprimer les anciens refresh tokens expirés
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()', [user.id])

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, hashToken(refreshToken), expiresAt],
    )

    res.json({ accessToken, refreshToken, user: { id: user.id, email } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Erreur interne.' })
  }
})

authRouter.post('/refresh', authLimiter, async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(401).json({ error: 'Refresh token manquant.' })
    return
  }

  try {
    const payload = jwt.verify(refreshToken, requireEnv('JWT_REFRESH_SECRET')) as { sub: string }
    const tokenHash = hashToken(refreshToken)

    const stored = await pool.query(
      'SELECT id, user_id FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW()',
      [tokenHash, payload.sub],
    )

    if (stored.rows.length === 0) {
      res.status(401).json({ error: 'Refresh token invalide ou expiré.' })
      return
    }

    const userRow = await pool.query('SELECT id, email FROM users WHERE id = $1', [payload.sub])
    if (!userRow.rows[0]) {
      res.status(401).json({ error: 'Utilisateur introuvable.' })
      return
    }
    const { id, email } = userRow.rows[0]

    // Rotation du refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [stored.rows[0].id])

    const newAccessToken  = signAccess(id, email)
    const newRefreshToken = signRefresh(id)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [id, hashToken(newRefreshToken), expiresAt],
    )

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch {
    res.status(401).json({ error: 'Refresh token invalide.' })
  }
})

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken && typeof refreshToken === 'string') {
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(refreshToken)])
  }
  res.json({ ok: true })
})
