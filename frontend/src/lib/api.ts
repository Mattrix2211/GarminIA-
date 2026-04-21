import { supabase } from './supabase'
import {
  DEMO_MODE, demoDaily, demoSessions, demoSessionDetail, demoMuscuSession,
  demoAmrapSession, demoJournalSessions, demoWeights, demoHrvHistory,
  demoWeeklyStats, demoExercises, demoProactiveAlerts, demoWeeklySummaries,
  demoCalendarSessions, demoCalendarHrv,
} from './demo'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
  }
}

// ─── Mock responses en mode démo ─────────────────────────────────────────────

function demoResponse<T>(path: string): T | null {
  if (path === '/api/dashboard/today') return demoDaily as T
  if (path === '/api/dashboard/sessions-today') return demoSessions as T
  if (path === '/api/garmin/status') return { connected: true, lastSync: new Date().toISOString() } as T
  if (path === '/api/wahoo/status') return { connected: false, lastSync: null } as T
  if (path === '/api/apple/status') return { connected: false, lastSync: null } as T
  if (path === '/api/push/vapid-key') return { vapidKey: '' } as T
  if (path === '/api/wahoo/oauth/start') return { authorizeUrl: '#' } as T
  if (path === '/api/plans/current') return { id: 'demo-plan' } as T
  if (path === '/api/coach/proactive') return demoProactiveAlerts as T
  if (path === '/api/coach/weekly-summary') return demoWeeklySummaries as T
  if (path === '/api/sessions?limit=30') return demoJournalSessions as T
  if (path === '/api/profile/weight') return demoWeights as T
  if (path.startsWith('/api/garmin/history')) return demoHrvHistory as T
  if (path === '/api/stats/weekly') return demoWeeklyStats as T
  if (path === '/api/stats/exercises') return demoExercises as T
  if (path.startsWith('/api/calendar/sessions')) {
    const month = new URLSearchParams(path.split('?')[1]).get('month') ?? ''
    return demoCalendarSessions.filter(s => s.date.startsWith(month)) as T
  }
  if (path.startsWith('/api/calendar/hrv')) {
    const month = new URLSearchParams(path.split('?')[1]).get('month') ?? ''
    return Object.fromEntries(Object.entries(demoCalendarHrv).filter(([k]) => k.startsWith(month))) as T
  }
  if (path === '/api/profile') return null
  if (path.startsWith('/api/sessions/demo-session-muscu')) return demoMuscuSession as T
  if (path.startsWith('/api/sessions/demo-session-amrap')) return demoAmrapSession as T
  if (path.startsWith('/api/sessions/')) return demoSessionDetail as T
  return null
}

// ─── Exports publics ──────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  if (DEMO_MODE) {
    await delay(120)
    const r = demoResponse<T>(path)
    if (r !== undefined) return r as T
  }
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (DEMO_MODE) {
    await delay(400)
    if (path === '/api/plans/generate') return { ok: true, planId: 'demo-plan' } as T
    if (path === '/api/garmin/sync') return { ok: true } as T
    if (path === '/api/coach/weekly-summary/generate') return { ok: true, content: demoWeeklySummaries[0].content } as T
    if (path === '/api/garmin/oauth/callback') return { ok: true, connected: true } as T
    if (path.includes('/log')) return { ok: true } as T
    if (path.includes('/sets')) return { ok: true } as T
    if (path === '/api/profile') return { ok: true } as T
    return { ok: true } as T
  }
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  if (DEMO_MODE) { await delay(200); return { ok: true } as T }
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiStreamPost(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (DEMO_MODE) {
    const { message } = body as { message: string }
    const responses: Record<string, string> = {
      default: "Tes données sont bonnes ce matin. HRV à 58ms, Body Battery à 74 — tu peux charger aujourd'hui. La séance vélo Z2 prévue est bien adaptée à ton état de forme. Garde une cadence autour de 88rpm et reste strict sur la zone 2 les 45 premières minutes.",
      'fatigué': "Regarde ta HRV cette semaine — elle reste stable autour de 58ms, donc la fatigue que tu ressens n'est pas physiologique. C'est probablement la semaine chargée qui pèse mentalement. Un jour de récupération active demain te fera du bien.",
      'progresse': "Oui, clairement. Ton FTP a progressé de 12W en 4 semaines (273→285W), ta FC de repos est à 48bpm (−3bpm ce mois), et ton allure au seuil en course est passée à 3'58\"/km. Tu es dans une phase de surcompensation positive.",
    }
    const key = Object.keys(responses).find(k => message.toLowerCase().includes(k)) ?? 'default'
    const text = responses[key]

    for (let i = 0; i < text.length; i += 3) {
      if (signal?.aborted) return
      await delay(25)
      onChunk(text.slice(i, i + 3))
    }
    return
  }
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body), signal })
  if (!res.ok) throw new Error(await res.text())
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    decoder.decode(value, { stream: true }).split('\n').forEach(line => {
      if (line.startsWith('data: ')) { const d = line.slice(6); if (d !== '[DONE]') onChunk(d) }
    })
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
