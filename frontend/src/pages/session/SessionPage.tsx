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

  if (finished) return <FinishScreen session={session} onBack={() => navigate('/')} />

  return session.isAmrap
    ? <AmrapMode session={session} onFinish={handleFinish} />
    : <ClassicStepper session={session} onFinish={handleFinish} />
}

function FinishScreen({ session, onBack }: { session: SessionData; onBack: () => void }) {
  return (
    <div className={styles.finishScreen}>
      <div className={styles.finishEmoji}>🏆</div>
      <h1>Séance terminée !</h1>
      <p>{session.title}</p>
      <button className={styles.btnPrimary} onClick={onBack}>Retour à l'accueil</button>
    </div>
  )
}
