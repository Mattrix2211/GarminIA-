import { useState, useEffect } from 'react'
import { apiGet, apiPatch } from '@/lib/api'
import styles from './CalendarPage.module.css'

interface CalSession {
  id: string
  date: string
  sport: string
  title: string
  durationMin: number
  status: 'planned' | 'completed'
  tss?: number | null
}

const SPORT_COLORS: Record<string, string> = {
  Cyclisme: '#c8f064',
  'Course à pied': '#ff7c5c',
  Natation: '#55cccc',
  Trail: '#6c63ff',
  Musculation: '#ffaa33',
  CrossFit: '#ff5555',
  Triathlon: '#cc88ff',
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function computeWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Mon=0
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function ds(d: Date): string {
  return d.toISOString().split('T')[0]
}

function sportColor(sport: string): string {
  return SPORT_COLORS[sport] ?? '#888'
}

function hrvColor(hrv: number): string {
  if (hrv >= 55) return 'var(--success)'
  if (hrv >= 40) return 'var(--warning)'
  return 'var(--danger)'
}

export function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [sessions, setSessions] = useState<CalSession[]>([])
  const [hrvMap, setHrvMap] = useState<Record<string, number>>({})
  const [movingSession, setMovingSession] = useState<CalSession | null>(null)
  const [dragSession, setDragSession] = useState<CalSession | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    Promise.all([
      apiGet<CalSession[]>(`/api/calendar/sessions?month=${monthStr}`),
      apiGet<Record<string, number>>(`/api/calendar/hrv?month=${monthStr}`),
    ])
      .then(([s, h]) => { setSessions(s); setHrvMap(h) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  function navMonth(dir: 1 | -1) {
    let m = month + dir, y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
    setMovingSession(null)
  }

  async function handleMove(session: CalSession, newDate: string) {
    if (session.date === newDate) return
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, date: newDate } : s))
    setMovingSession(null)
    setDragSession(null)
    await apiPatch(`/api/sessions/${session.id}/move`, { date: newDate })
  }

  const weeks = computeWeeks(year, month)
  const todayStr = ds(today)

  const byDate = sessions.reduce<Record<string, CalSession[]>>((acc, s) => {
    ;(acc[s.date] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className={styles.page}>
      {/* Month header */}
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={() => navMonth(-1)} aria-label="Mois précédent">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4.5L6.5 9L11 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.monthTitle}>
          {MONTHS_FR[month]} <span className={styles.yearLabel}>{year}</span>
        </h1>
        <button className={styles.navBtn} onClick={() => navMonth(1)} aria-label="Mois suivant">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 4.5L11.5 9L7 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Move mode banner */}
      {movingSession && (
        <div className={styles.moveBanner}>
          <div className={styles.moveBannerDot} style={{ background: sportColor(movingSession.sport) }} />
          <span className={styles.moveBannerText}>
            Glisse ou tape une date pour déplacer{' '}
            <strong>{movingSession.title.split(' ').slice(0, 3).join(' ')}</strong>
          </span>
          <button className={styles.cancelBtn} onClick={() => setMovingSession(null)}>✕</button>
        </div>
      )}

      {/* Weekday labels */}
      <div className={styles.weekHeader}>
        {DAYS_SHORT.map((d, i) => (
          <span key={i} className={styles.dayLabel}>{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className={styles.loadingWrap}>
          {[...Array(5)].map((_, i) => <div key={i} className={styles.loadingRow} />)}
        </div>
      ) : (
        <div className={styles.grid}>
          {weeks.map((week, wi) => {
            const validDays = week.filter(Boolean) as Date[]
            const weekMinutes = validDays.reduce((sum, d) =>
              sum + (byDate[ds(d)] ?? []).reduce((s2, s) => s2 + (s.durationMin ?? 0), 0), 0)
            const weekTss = validDays.reduce((sum, d) =>
              sum + (byDate[ds(d)] ?? []).reduce((s2, s) => s2 + (s.tss ?? 0), 0), 0)
            const h = Math.floor(weekMinutes / 60)
            const m = weekMinutes % 60

            return (
              <div key={wi} className={styles.weekRow}>
                <div className={styles.weekDays}>
                  {week.map((day, di) => {
                    if (!day) {
                      return <div key={di} className={`${styles.cell} ${styles.cellEmpty}`} />
                    }
                    const dateKey = ds(day)
                    const daySessions = byDate[dateKey] ?? []
                    const hrv = hrvMap[dateKey]
                    const isToday = dateKey === todayStr
                    const isPast = dateKey < todayStr

                    const isDragTarget = dragOverDate === dateKey && dragSession !== null
                    return (
                      <div
                        key={di}
                        className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${(movingSession || dragSession) ? styles.cellMovable : ''} ${isPast && !isToday ? styles.cellPast : ''} ${isDragTarget ? styles.cellDragOver : ''}`}
                        onClick={() => movingSession && handleMove(movingSession, dateKey)}
                        onDragOver={e => { if (dragSession) { e.preventDefault(); setDragOverDate(dateKey) } }}
                        onDragLeave={() => setDragOverDate(null)}
                        onDrop={e => { e.preventDefault(); if (dragSession) { handleMove(dragSession, dateKey); setDragOverDate(null) } }}
                      >
                        <div className={styles.cellTop}>
                          <span className={isToday ? styles.todayBadge : styles.dayNum}>
                            {day.getDate()}
                          </span>
                          {hrv != null && (
                            <span
                              className={styles.hrvDot}
                              style={{ background: hrvColor(hrv) }}
                              title={`HRV ${hrv}ms`}
                            />
                          )}
                        </div>

                        <div className={styles.pills}>
                          {daySessions.slice(0, 2).map(s => {
                            const color = sportColor(s.sport)
                            const isSelected = movingSession?.id === s.id
                            return (
                              <button
                                key={s.id}
                                draggable
                                className={`${styles.pill} ${isSelected ? styles.pillSelected : ''} ${s.status === 'completed' ? styles.pillDone : ''}`}
                                style={{
                                  borderColor: color,
                                  background: `${color}20`,
                                  color,
                                  cursor: 'grab',
                                }}
                                onDragStart={e => {
                                  e.dataTransfer.effectAllowed = 'move'
                                  e.dataTransfer.setData('text/plain', s.id)
                                  setDragSession(s)
                                  setMovingSession(null)
                                }}
                                onDragEnd={() => { setDragSession(null); setDragOverDate(null) }}
                                onClick={e => {
                                  e.stopPropagation()
                                  setMovingSession(movingSession?.id === s.id ? null : s)
                                  setDragSession(null)
                                }}
                              >
                                {s.title.split(' ')[0]}
                              </button>
                            )
                          })}
                          {daySessions.length > 2 && (
                            <span className={styles.moreLabel}>+{daySessions.length - 2}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Week summary */}
                {weekMinutes > 0 && (
                  <div className={styles.weekStat}>
                    <div className={styles.weekBarWrap}>
                      <div
                        className={styles.weekBarFill}
                        style={{ width: `${Math.min((weekMinutes / 480) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={styles.weekStatText}>
                      {h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `${m}min`}
                      {weekTss > 0 && <span className={styles.tssLabel}> · {weekTss} TSS</span>}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(SPORT_COLORS).slice(0, 5).map(([sport, color]) => (
          <div key={sport} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            <span className={styles.legendLabel}>{sport.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
