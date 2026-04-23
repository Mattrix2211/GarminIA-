import { create } from 'zustand'
import { DEMO_MODE } from '@/lib/demo'

export interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const DEMO_USER: AuthUser = { id: 'demo-user', email: 'matthis@demo.fr' }

function parseJwtExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return 0
  }
}

function parseJwtSub(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? ''
  } catch {
    return ''
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function authFetch(path: string, body: unknown): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string } }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Erreur réseau')
    throw new Error(msg)
  }
  return res.json()
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: async () => {
    if (DEMO_MODE) {
      set({ user: DEMO_USER, loading: false })
      return
    }
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    if (!accessToken || !refreshToken) {
      set({ user: null, loading: false })
      return
    }
    // If access token is still valid, use it
    if (parseJwtExp(accessToken) > Date.now() + 30_000) {
      const id = parseJwtSub(accessToken)
      const email = localStorage.getItem('user_email') ?? ''
      set({ user: { id, email }, loading: false })
      return
    }
    // Try to refresh
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('access_token', data.accessToken)
        localStorage.setItem('refresh_token', data.refreshToken)
        localStorage.setItem('user_email', data.user.email)
        set({ user: data.user, loading: false })
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_email')
        set({ user: null, loading: false })
      }
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const data = await authFetch('/api/auth/login', { email, password })
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user_email', data.user.email)
    set({ user: data.user })
  },

  register: async (email, password) => {
    const data = await authFetch('/api/auth/register', { email, password })
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user_email', data.user.email)
    set({ user: data.user })
  },

  signOut: async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    set({ user: null })
  },
}))
