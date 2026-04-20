import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { apiGet } from '@/lib/api'
import { useProfileStore } from '@/stores/profileStore'
import styles from './StatsPage.module.css'

interface WeeklyStats {
  weekStart: string
  sessionsCount: number
  avgMood: number | null
  totalDurationMin: number
  tssTotal: number | null
}

interface WeightEntry {
  weekStartDate: string
  weightKg: number
}

interface HrvTrend {
  date: string
  hrv: number | null
  bodyBattery: number | null
}

interface ExerciseProgress {
  exerciseName: string
  entries: { date: string; maxKg: number; totalVolume: number }[]
}

export function StatsPage() {
  const { profile } = useProfileStore()
  const [weekly, setWeekly] = useState<WeeklyStats[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [hrv, setHrv] = useState<HrvTrend[]>([])
  const [exercises, setExercises] = useState<ExerciseProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<WeeklyStats[]>('/api/stats/weekly'),
      apiGet<WeightEntry[]>('/api/profile/weight'),
      apiGet<HrvTrend[]>('/api/garmin/history?days=30'),
      apiGet<ExerciseProgress[]>('/api/stats/exercises'),
    ])
      .then(([w, wt, h, ex]) => {
        setWeekly(w.slice(-8).reverse())
        setWeights(wt.slice(0, 8).reverse())
        setHrv(h.slice(0, 30).reverse())
        setExercises(ex)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const isMusculation = profile?.sports.includes('Musculation') || profile?.sports.includes('CrossFit')

  if (loading) return <div className={styles.loading}>Chargement…</div>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Statistiques</h1>

      {/* Séances par semaine */}
      {weekly.length > 0 && (
        <section className={styles.section}>
          <h2>Séances par semaine</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekly} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="weekStart" tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} tick={{ fontSize: 10, fill: '#606060' }} />
              <YAxis tick={{ fontSize: 10, fill: '#606060' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                labelStyle={{ color: '#a0a0a0', fontSize: 11 }}
                itemStyle={{ color: '#f0f0f0' }}
                formatter={(v: number) => [`${v} séances`]}
                labelFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              />
              <Bar dataKey="sessionsCount" radius={[4, 4, 0, 0]}>
                {weekly.map((entry, i) => (
                  <Cell key={i} fill={moodFill(entry.avgMood)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            <span style={{ color: 'var(--success)' }}>■</span> Bon ressenti
            <span style={{ color: 'var(--warning)' }}>■</span> Moyen
            <span style={{ color: 'var(--danger)' }}>■</span> Difficile
          </div>
        </section>
      )}

      {/* Courbe de poids */}
      {weights.length > 1 && (
        <section className={styles.section}>
          <h2>Évolution du poids</h2>
          <div className={styles.weightHeader}>
            <span className={styles.currentWeight}>{weights[weights.length - 1]?.weightKg} kg</span>
            {weights.length >= 2 && (
              <span className={styles.weightChange} style={{
                color: weights[weights.length - 1].weightKg < weights[0].weightKg ? 'var(--success)' : 'var(--danger)'
              }}>
                {weights[weights.length - 1].weightKg < weights[0].weightKg ? '↓' : '↑'}
                {Math.abs(weights[weights.length - 1].weightKg - weights[0].weightKg).toFixed(1)} kg
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weights} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="weekStartDate" tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} tick={{ fontSize: 10, fill: '#606060' }} />
              <YAxis tick={{ fontSize: 10, fill: '#606060' }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                itemStyle={{ color: '#f0f0f0' }}
                formatter={(v: number) => [`${v} kg`]}
              />
              <Line type="monotone" dataKey="weightKg" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* HRV sur 30 jours */}
      {hrv.filter(d => d.hrv).length > 3 && (
        <section className={styles.section}>
          <h2>HRV — 30 jours</h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={hrv.filter(d => d.hrv)} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} tick={{ fontSize: 10, fill: '#606060' }} />
              <YAxis tick={{ fontSize: 10, fill: '#606060' }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                itemStyle={{ color: '#f0f0f0' }}
                formatter={(v: number) => [`${v} ms`]}
              />
              <Line type="monotone" dataKey="hrv" stroke="#6c63ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Progression muscu */}
      {isMusculation && exercises.length > 0 && (
        <section className={styles.section}>
          <h2>Progression charges</h2>
          <div className={styles.exerciseList}>
            {exercises.slice(0, 6).map(ex => {
              const last = ex.entries[ex.entries.length - 1]
              const first = ex.entries[0]
              const diff = last && first ? last.maxKg - first.maxKg : 0
              return (
                <div key={ex.exerciseName} className={styles.exerciseRow}>
                  <span className={styles.exerciseName}>{ex.exerciseName}</span>
                  <span className={styles.exerciseMax}>{last?.maxKg ?? '—'} kg</span>
                  {diff !== 0 && (
                    <span className={styles.exerciseDiff} style={{ color: diff > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {diff > 0 ? '+' : ''}{diff} kg
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function moodFill(avgMood: number | null): string {
  if (!avgMood) return '#2a2a2a'
  if (avgMood >= 4) return '#55cc88'
  if (avgMood >= 3) return '#ffaa33'
  return '#ff5555'
}
