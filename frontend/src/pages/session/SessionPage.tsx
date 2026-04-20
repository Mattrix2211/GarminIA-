import { useParams } from 'react-router-dom'

export function SessionPage() {
  const { sessionId } = useParams()
  return (
    <div style={{ padding: '24px 16px' }}>
      <h1>Séance</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
        Mode séance plein écran — stepper + AMRAP — à venir. ID: {sessionId}
      </p>
    </div>
  )
}
