import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ClassicStepper } from '@/components/session/ClassicStepper'
import { AmrapMode } from '@/components/session/AmrapMode'
import styles from './SessionPage.module.css'

export interface Exercise {
  name: string
  sets: number
  reps: string
  duration?: string
  rest: number
  notes?: string
  weight?: number
}

export interface SessionData {
  id: string
  title: string
  sport: string
  description: string | null
  durationMin: number | null
  exercises: Exercise[]
  isAmrap: boolean
  amrapDurationMin?: number
  aiComment?: string | null
}

export function SessionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    apiGet<SessionData>(`/api/sessions/${sessionId}`)
      .then(setSession)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sessionId])

  async function handleFinish(log: {
    durationMin: number
    perceivedEffort: number
    moodStars: number
    notes: string
  }) {
    await apiPost(`/api/sessions/${sessionId}/log`, log)
    setFinished(true)
  }

  if (loading) return <LoadingScreen message="Chargement de la séance…" />
  if (!session) return <div className={styles.error}>Séance introuvable</div>

  if (finished) {
    return <FinishScreen sessionId={sessionId!} session={session} onBack={() => navigate('/')} />
  }

  return session.isAmrap
    ? <AmrapMode session={session} onFinish={handleFinish} />
    : <ClassicStepper session={session} onFinish={handleFinish} />
}

function FinishScreen({
  sessionId,
  session,
  onBack,
}: {
  sessionId: string
  session: SessionData
  onBack: () => void
}) {
  const [aiComment, setAiComment] = useState<string | null>(session.aiComment ?? null)

  useEffect(() => {
    if (aiComment) return
    let tries = 0
    const interval = setInterval(async () => {
      tries++
      try {
        const updated = await apiGet<SessionData>(`/api/sessions/${sessionId}`)
        if (updated.aiComment) {
          setAiComment(updated.aiComment)
          clearInterval(interval)
        }
      } catch { /* ignore */ }
      if (tries >= 20) clearInterval(interval) // abandon après ~40s
    }, 2000)
    return () => clearInterval(interval)
  }, [sessionId, aiComment])

  return (
    <div className={styles.finishScreen}>
      <div className={styles.finishEmoji}>🏆</div>
      <h1>Séance terminée !</h1>
      <p>{session.title}</p>
      {aiComment ? (
        <div className={styles.aiComment}>
          <span className={styles.aiCommentIcon}>🤖</span>
          <p className={styles.aiCommentText}>{aiComment}</p>
        </div>
      ) : (
        <p className={styles.aiLoading}>🤖 Analyse de ton coach en cours…</p>
      )}
      <button className={styles.btnPrimary} onClick={onBack}>Retour à l'accueil</button>
    </div>
  )
}
