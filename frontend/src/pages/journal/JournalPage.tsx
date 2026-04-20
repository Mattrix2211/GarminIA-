import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '@/lib/api'
import { useProfileStore } from '@/stores/profileStore'
import styles from './JournalPage.module.css'

interface WeeklySummary {
  id: string
  week_start_date: string
  content: string
  sessions_count: number | null
}

interface JournalSession {
  id: string
  date: string
  sport: string
  title: string
  durationMin: number | null
  perceivedEffort: number | null
  moodStars: number | null
  hrAvg: number | null
  powerAvgWatts: number | null
  pacePerKm: string | null
  tss: number | null
  notes: string | null
  status: string
}

interface WeightEntry {
  weekStartDate: string
  weightKg: number
}

export function JournalPage() {
  const { profile } = useProfileStore()
  const [sessions, setSessions] = useState<JournalSession[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    Promise.all([
      apiGet<JournalSession[]>('/api/sessions?limit=30'),
      apiGet<WeightEntry[]>('/api/profile/weight'),
      apiGet<WeeklySummary[]>('/api/coach/weekly-summary'),
    ])
      .then(([s, w, ws]) => { setSessions(s); setWeights(w); setWeeklySummaries(ws) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const thisWeekMonday = getMonday(new Date())
  const hasWeightThisWeek = weights.some(w => w.weekStartDate === thisWeekMonday)

  async function saveWeight() {
    const kg = parseFloat(weightInput)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    await apiPost('/api/profile/weight', { weekStartDate: thisWeekMonday, weightKg: kg })
    setWeights(prev => [{ weekStartDate: thisWeekMonday, weightKg: kg }, ...prev.filter(w => w.weekStartDate !== thisWeekMonday)])
    setShowWeightModal(false)
    setWeightInput('')
  }

  if (loading) return <div className={styles.loading}>Chargement…</div>

  const grouped = groupByWeek(sessions)

  async function generateSummary(weekStart: string) {
    setGeneratingSummary(true)
    try {
      const { content } = await apiPost<{ content: string }>('/api/coach/weekly-summary/generate', { weekStart })
      setWeeklySummaries(prev => [
        { id: crypto.randomUUID(), week_start_date: weekStart, content, sessions_count: null },
        ...prev.filter(s => s.week_start_date !== weekStart),
      ])
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingSummary(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Journal</h1>
        {!hasWeightThisWeek && (
          <button className={styles.weightBtn} onClick={() => setShowWeightModal(true)}>
            ⚖️ Poids
          </button>
        )}
      </header>

      {/* Streak */}
      <StreakBadge sessions={sessions} />

      {/* Poids de la semaine */}
      {weights[0] && (
        <div className={styles.weightCard}>
          <span>Poids cette semaine</span>
          <strong>{weights[0].weightKg} kg</strong>
          {weights[1] && (
            <span className={styles.weightDiff} style={{ color: weights[0].weightKg < weights[1].weightKg ? 'var(--success)' : 'var(--danger)' }}>
              {weights[0].weightKg < weights[1].weightKg ? '↓' : '↑'} {Math.abs(weights[0].weightKg - weights[1].weightKg).toFixed(1)} kg
            </span>
          )}
        </div>
      )}

      {/* Sessions groupées par semaine */}
      {Object.entries(grouped).map(([week, weekSessions]) => {
        const summary = weeklySummaries.find(s => s.week_start_date === week)
        const isPastWeek = week < getMonday(new Date())
        return (
          <div key={week} className={styles.weekGroup}>
            <div className={styles.weekHeader}>
              <span className={styles.weekLabel}>{formatWeek(week)}</span>
              <span className={styles.weekCount}>{weekSessions.filter(s => s.status === 'completed').length} séances</span>
            </div>
            <WeekBar sessions={weekSessions} />
            {weekSessions.map(s => (
              <SessionEntry key={s.id} session={s} sport={profile?.sports[0] ?? ''} />
            ))}
            {/* Bilan hebdomadaire IA */}
            {isPastWeek && (
              summary
                ? <WeeklySummaryCard summary={summary} />
                : <button
                    className={styles.summaryBtn}
                    onClick={() => generateSummary(week)}
                    disabled={generatingSummary}
                  >
                    {generatingSummary ? '🤖 Génération…' : '📊 Générer le bilan IA de cette semaine'}
                  </button>
            )}
          </div>
        )
      })}

      {sessions.length === 0 && (
        <div className={styles.empty}>
          <p>Aucune séance enregistrée. Lance ta première séance depuis l'accueil.</p>
        </div>
      )}

      {/* Modal poids */}
      {showWeightModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3>Poids de la semaine</h3>
            <p className={styles.modalHint}>Une seule saisie par semaine</p>
            <div className={styles.weightInputRow}>
              <input
                type="number"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                placeholder="70.5"
                step="0.1"
                className={styles.weightInput}
                autoFocus
                inputMode="decimal"
              />
              <span>kg</span>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowWeightModal(false)}>Annuler</button>
              <button className={styles.btnPrimary} onClick={saveWeight}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StreakBadge({ sessions }: { sessions: JournalSession[] }) {
  const streak = computeStreak(sessions)
  if (streak === 0) return null
  return (
    <div className={styles.streak}>
      <span className={styles.streakFire}>🔥</span>
      <strong>{streak}</strong>
      <span>jour{streak > 1 ? 's' : ''} consécutif{streak > 1 ? 's' : ''}</span>
    </div>
  )
}

function WeekBar({ sessions }: { sessions: JournalSession[] }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const byDay: Record<number, JournalSession | undefined> = {}
  sessions.forEach(s => {
    const d = new Date(s.date).getDay()
    byDay[d === 0 ? 6 : d - 1] = s
  })

  return (
    <div className={styles.weekBar}>
      {days.map((d, i) => {
        const s = byDay[i]
        return (
          <div key={i} className={styles.dayCell}>
            <div
              className={`${styles.dayDot} ${s ? (s.status === 'completed' ? styles.dotDone : styles.dotPlanned) : ''}`}
              style={s?.status === 'completed' ? { background: moodColor(s.moodStars) } : {}}
            />
            <span className={styles.dayLabel}>{d}</span>
          </div>
        )
      })}
    </div>
  )
}

function SessionEntry({ session: s, sport }: { session: JournalSession; sport: string }) {
  return (
    <div className={`${styles.entry} ${s.status !== 'completed' ? styles.entryPlanned : ''}`}>
      <div className={styles.entryLeft}>
        <div className={styles.entryDate}>{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</div>
        <div className={styles.entryMood}>
          {s.moodStars ? '★'.repeat(s.moodStars) : s.status === 'planned' ? '○' : '—'}
        </div>
      </div>
      <div className={styles.entryBody}>
        <strong className={styles.entryTitle}>{s.title}</strong>
        <div className={styles.entryMetas}>
          {s.durationMin && <span>⏱ {s.durationMin}min</span>}
          {s.perceivedEffort && <span>RPE {s.perceivedEffort}/10</span>}
          {s.hrAvg && <span>❤️ {s.hrAvg}bpm</span>}
          {s.powerAvgWatts && <span>⚡ {s.powerAvgWatts}W</span>}
          {s.pacePerKm && <span>🏃 {s.pacePerKm}/km</span>}
          {s.tss && <span>TSS {s.tss}</span>}
        </div>
        {s.notes && <p className={styles.entryNotes}>{s.notes}</p>}
      </div>
      {s.status === 'planned' && (
        <Link to={`/session/${s.id}`} className={styles.entryStart}>▶</Link>
      )}
    </div>
  )
}

function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const [expanded, setExpanded] = useState(false)
  const lines = summary.content.split('\n').filter(Boolean)
  const preview = lines.slice(0, 2).join(' ')

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader} onClick={() => setExpanded(e => !e)}>
        <span className={styles.summaryIcon}>📊</span>
        <span>Bilan coach</span>
        <span className={styles.summaryToggle}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded
        ? <div className={styles.summaryContent}>
            {lines.map((line, i) => (
              <p key={i} className={line.startsWith('**') ? styles.summaryHeading : styles.summaryText}>
                {line.replace(/\*\*/g, '')}
              </p>
            ))}
          </div>
        : <p className={styles.summaryPreview}>{preview}…</p>
      }
    </div>
  )
}

function groupByWeek(sessions: JournalSession[]): Record<string, JournalSession[]> {
  const result: Record<string, JournalSession[]> = {}
  sessions.forEach(s => {
    const monday = getMonday(new Date(s.date))
    if (!result[monday]) result[monday] = []
    result[monday].push(s)
  })
  return result
}

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  return mon.toISOString().split('T')[0]
}

function formatWeek(monday: string): string {
  const d = new Date(monday)
  const end = new Date(monday)
  end.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

function moodColor(stars: number | null): string {
  if (!stars) return 'var(--bg-elevated)'
  if (stars >= 4) return 'var(--success)'
  if (stars >= 3) return 'var(--warning)'
  return 'var(--danger)'
}

function computeStreak(sessions: JournalSession[]): number {
  const completed = sessions.filter(s => s.status === 'completed').map(s => s.date).sort().reverse()
  if (!completed.length) return 0
  let streak = 0
  const today = new Date().toISOString().split('T')[0]
  let cursor = today
  for (const date of completed) {
    if (date === cursor) { streak++; cursor = prevDay(cursor) }
    else if (date < cursor) break
  }
  return streak
}

function prevDay(d: string): string {
  const date = new Date(d)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}
