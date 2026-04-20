import { useState } from 'react'
import { apiPost } from '@/lib/api'
import styles from './SessionLogger.module.css'

interface Props {
  defaultDuration: number
  sessionId: string
  setData: Record<string, { kg: number; reps: number }[]>
  onSubmit: (log: { durationMin: number; perceivedEffort: number; moodStars: number; notes: string }) => void
}

export function SessionLogger({ defaultDuration, sessionId, setData, onSubmit }: Props) {
  const [duration, setDuration] = useState(defaultDuration)
  const [effort, setEffort] = useState(7)
  const [mood, setMood] = useState(4)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    // Sauvegarder les séries muscu si présentes
    const entries = Object.entries(setData)
    if (entries.length > 0) {
      const rows = entries.flatMap(([exerciseName, sets]) =>
        sets.map((s, i) => ({
          sessionId,
          exerciseName,
          setNumber: i + 1,
          weightKg: s.kg,
          reps: s.reps,
        }))
      )
      await apiPost('/api/sessions/sets', rows).catch(console.error)
    }
    onSubmit({ durationMin: duration, perceivedEffort: effort, moodStars: mood, notes })
  }

  return (
    <div className={styles.container}>
      <h2>Bilan de séance</h2>

      <div className={styles.field}>
        <label>Durée réelle</label>
        <div className={styles.durationRow}>
          <button className={styles.adj} onClick={() => setDuration(d => Math.max(5, d - 5))}>−5</button>
          <span className={styles.durationVal}>{duration} min</span>
          <button className={styles.adj} onClick={() => setDuration(d => d + 5)}>+5</button>
        </div>
      </div>

      <div className={styles.field}>
        <label>Effort perçu (RPE)</label>
        <div className={styles.rpeRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              className={`${styles.rpeBtn} ${effort === n ? styles.rpeActive : ''}`}
              style={effort === n ? { background: rpeColor(n), borderColor: rpeColor(n) } : {}}
              onClick={() => setEffort(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className={styles.rpeLabel}>{rpeLabel(effort)}</p>
      </div>

      <div className={styles.field}>
        <label>Ressenti général</label>
        <div className={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={`${styles.star} ${mood >= n ? styles.starFilled : ''}`}
              onClick={() => setMood(n)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>Notes libres</label>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Comment s'est passée la séance ? Sensations, douleurs, points d'attention…"
          rows={3}
        />
      </div>

      <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Terminer la séance ✓'}
      </button>
    </div>
  )
}

function rpeColor(n: number): string {
  if (n <= 3) return 'var(--success)'
  if (n <= 6) return 'var(--warning)'
  return 'var(--danger)'
}

function rpeLabel(n: number): string {
  const labels: Record<number, string> = {
    1: 'Très léger', 2: 'Léger', 3: 'Modéré', 4: 'Confortable',
    5: 'Soutenu', 6: 'Difficile', 7: 'Très difficile', 8: 'Intense',
    9: 'Maximal', 10: 'Effort max absolu',
  }
  return labels[n] ?? ''
}
