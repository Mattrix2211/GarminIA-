import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { apiGet, apiPost } from '@/lib/api'
import { GarminConnectButton } from '@/components/garmin/GarminConnectButton'
import { SportWidget } from '@/components/dashboard/SportWidget'
import styles from './DashboardPage.module.css'

interface ProactiveAlert {
  id: string
  type: string
  content: string
  date: string
}

interface DailyStatus {
  hrv: number | null
  bodyBattery: number | null
  sleepScore: number | null
  restingHr: number | null
  recoveryTimeHours: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  aiRecommendation: string | null
  sleepDurationMin: number | null
  sleepDeepMin: number | null
  sleepRemMin: number | null
  stressAvg: number | null
}

interface TodaySession {
  id: string
  title: string
  sport: string
  description: string | null
  durationMin: number | null
  status: string
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const [status, setStatus] = useState<DailyStatus | null>(null)
  const [sessions, setSessions] = useState<TodaySession[]>([])
  const [garminConnected, setGarminConnected] = useState(false)
  const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlert[]>([])
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      apiGet<DailyStatus>('/api/dashboard/today'),
      apiGet<TodaySession[]>('/api/dashboard/sessions-today'),
      apiGet<{ connected: boolean }>('/api/garmin/status'),
      apiGet<ProactiveAlert[]>('/api/coach/proactive'),
      apiGet<{ id: string } | null>('/api/plans/current'),
    ])
      .then(([daily, todaySessions, garminStatus, alerts, currentPlan]) => {
        setStatus(daily)
        setSessions(todaySessions)
        setGarminConnected(garminStatus.connected)
        setProactiveAlerts(alerts.filter(a => a.type === 'proactive').slice(0, 2))
        setHasPlan(!!currentPlan)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const loadRatio = status?.acuteLoad && status?.chronicLoad
    ? status.acuteLoad / status.chronicLoad
    : null

  async function generatePlan() {
    setGeneratingPlan(true)
    try {
      await apiPost('/api/plans/generate', {})
      const todaySessions = await apiGet<TodaySession[]>('/api/dashboard/sessions-today')
      setSessions(todaySessions)
      setHasPlan(true)
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingPlan(false)
    }
  }

  if (loading) return <div className={styles.loadingPulse}><div /><div /><div /></div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Bonjour{profile?.first_name ? `, ${profile.first_name}` : ''} 👋</h1>
          <p className={styles.date}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {!garminConnected && (
          <GarminConnectButton onConnected={() => setGarminConnected(true)} />
        )}
      </header>

      {/* Métriques récupération */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Récupération</h2>
        <div className={styles.metricsGrid}>
          <MetricCard
            label="HRV"
            value={status?.hrv}
            unit="ms"
            color={scoreColor(status?.hrv, 50, 30)}
            icon="❤️"
          />
          <MetricCard
            label="Body Battery"
            value={status?.bodyBattery}
            unit="/100"
            color={scoreColor(status?.bodyBattery, 60, 30)}
            icon="⚡"
          />
          <MetricCard
            label="Sommeil"
            value={status?.sleepScore}
            unit="/100"
            color={scoreColor(status?.sleepScore, 70, 50)}
            icon="🌙"
            sub={status?.sleepDurationMin ? `${Math.floor(status.sleepDurationMin / 60)}h${String(status.sleepDurationMin % 60).padStart(2, '0')}` : undefined}
          />
          <MetricCard
            label="FC repos"
            value={status?.restingHr}
            unit="bpm"
            icon="💓"
          />
        </div>
      </section>

      {/* Détail sommeil */}
      {(status?.sleepDeepMin || status?.sleepRemMin) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Phases de sommeil</h2>
          <div className={styles.sleepBars}>
            <SleepBar label="Profond" minutes={status.sleepDeepMin ?? 0} color="#6c63ff" />
            <SleepBar label="REM" minutes={status.sleepRemMin ?? 0} color={styles.accent} />
            <SleepBar label="Léger" minutes={(status.sleepDurationMin ?? 0) - (status.sleepDeepMin ?? 0) - (status.sleepRemMin ?? 0)} color="#555" />
          </div>
        </section>
      )}

      {/* Charge d'entraînement */}
      {loadRatio !== null && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Charge d'entraînement</h2>
          <div className={styles.loadCard}>
            <div className={styles.loadItem}>
              <span>Charge aiguë (7j)</span>
              <strong>{status?.acuteLoad?.toFixed(0)}</strong>
            </div>
            <div className={styles.loadDivider} />
            <div className={styles.loadItem}>
              <span>Charge chronique (28j)</span>
              <strong>{status?.chronicLoad?.toFixed(0)}</strong>
            </div>
            <div className={styles.loadDivider} />
            <div className={styles.loadItem}>
              <span>Ratio</span>
              <strong style={{ color: ratioColor(loadRatio) }}>
                {loadRatio.toFixed(2)}
                {loadRatio > 1.5 && ' ⚠️'}
              </strong>
            </div>
          </div>
          <LoadRatioBar ratio={loadRatio} />
        </section>
      )}

      {/* Recommandation IA */}
      {status?.aiRecommendation && (
        <section className={styles.aiCard}>
          <div className={styles.aiHeader}>
            <span>🤖</span>
            <span>Coach IA — Analyse du jour</span>
          </div>
          <p>{status.aiRecommendation}</p>
          <Link to="/chat" className={styles.aiCta}>Parler à mon coach →</Link>
        </section>
      )}

      {/* Widget sport du jour */}
      {sessions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Préparation du jour</h2>
          <SportWidget
            profile={profile}
            todaySessions={sessions}
            hrv={status?.hrv}
            bodyBattery={status?.bodyBattery}
          />
        </section>
      )}

      {/* Séances du jour */}
      {sessions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Au programme aujourd'hui</h2>
          <div className={styles.sessionsList}>
            {sessions.map(s => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Alertes proactives */}
      {proactiveAlerts.length > 0 && (
        <section className={styles.section}>
          {proactiveAlerts.map(a => (
            <div key={a.id} className={styles.proactiveCard}>
              <span className={styles.proactiveIcon}>💡</span>
              <p>{a.content}</p>
            </div>
          ))}
        </section>
      )}

      {/* Bouton générer plan */}
      {!hasPlan && sessions.length === 0 && (
        <section className={styles.section}>
          <button
            className={styles.generatePlanBtn}
            onClick={generatePlan}
            disabled={generatingPlan}
          >
            {generatingPlan ? '🤖 Génération du plan…' : '✨ Générer mon plan de la semaine'}
          </button>
        </section>
      )}

      {/* Pas de données Garmin */}
      {!garminConnected && !status?.hrv && (
        <div className={styles.noData}>
          <p>Connecte ton Garmin pour voir tes données de récupération automatiquement chaque matin.</p>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label, value, unit, color, icon, sub,
}: {
  label: string; value: number | null | undefined; unit: string
  color?: string; icon: string; sub?: string
}) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}>{icon}</span>
        <span className={styles.metricLabel}>{label}</span>
      </div>
      <span className={styles.metricValue} style={{ color: color ?? 'var(--text-primary)' }}>
        {value != null ? value : '—'}
      </span>
      <span className={styles.metricUnit}>{value != null ? unit : ''}</span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  )
}

function SleepBar({ label, minutes, color }: { label: string; minutes: number; color: string }) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return (
    <div className={styles.sleepBarRow}>
      <span className={styles.sleepBarLabel}>{label}</span>
      <div className={styles.sleepBarTrack}>
        <div className={styles.sleepBarFill} style={{ width: `${Math.min((minutes / 480) * 100, 100)}%`, background: color }} />
      </div>
      <span className={styles.sleepBarTime}>{h}h{String(m).padStart(2, '0')}</span>
    </div>
  )
}

function LoadRatioBar({ ratio }: { ratio: number }) {
  const pct = Math.min((ratio / 2) * 100, 100)
  return (
    <div className={styles.ratioBar}>
      <div className={styles.ratioFill} style={{ width: `${pct}%`, background: ratioColor(ratio) }} />
      <div className={styles.ratioCursor} style={{ left: `${Math.min((1 / 2) * 100, 100)}%` }} />
    </div>
  )
}

function SessionCard({ session }: { session: TodaySession }) {
  return (
    <Link to={`/session/${session.id}`} className={styles.sessionCard}>
      <div className={styles.sessionInfo}>
        <span className={styles.sessionSport}>{sportEmoji(session.sport)} {session.sport}</span>
        <strong className={styles.sessionTitle}>{session.title}</strong>
        {session.description && <p className={styles.sessionDesc}>{session.description}</p>}
      </div>
      <div className={styles.sessionMeta}>
        {session.durationMin && <span>{session.durationMin} min</span>}
        <span className={styles.sessionArrow}>→</span>
      </div>
    </Link>
  )
}

function scoreColor(v: number | null | undefined, good: number, warn: number): string {
  if (!v) return 'var(--text-secondary)'
  if (v >= good) return 'var(--success)'
  if (v >= warn) return 'var(--warning)'
  return 'var(--danger)'
}

function ratioColor(r: number): string {
  if (r > 1.5) return 'var(--danger)'
  if (r > 1.3) return 'var(--warning)'
  return 'var(--success)'
}

function sportEmoji(sport: string): string {
  const map: Record<string, string> = {
    Cyclisme: '🚴', 'Course à pied': '🏃', Triathlon: '🏊', Trail: '🏔️',
    Natation: '🏊', Musculation: '💪', CrossFit: '🔥', 'Sport collectif': '⚽',
  }
  return map[sport] ?? '🏅'
}
