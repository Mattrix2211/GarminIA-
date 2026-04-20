import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiGet } from '@/lib/api'
import styles from './DashboardPage.module.css'

interface DailyStatus {
  hrv: number | null
  bodyBattery: number | null
  sleepScore: number | null
  restingHr: number | null
  recoveryTimeHours: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  aiRecommendation: string | null
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const [status, setStatus] = useState<DailyStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiGet<DailyStatus>('/api/dashboard/today')
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className={styles.loading}>Chargement…</div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Aujourd'hui</h1>
        <p className={styles.date}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </header>

      <section className={styles.metrics}>
        <MetricCard label="HRV" value={status?.hrv} unit="ms" color={getHrvColor(status?.hrv)} />
        <MetricCard label="Body Battery" value={status?.bodyBattery} unit="/100" color={getBatteryColor(status?.bodyBattery)} />
        <MetricCard label="Sommeil" value={status?.sleepScore} unit="/100" color={getSleepColor(status?.sleepScore)} />
        <MetricCard label="FC repos" value={status?.restingHr} unit="bpm" />
      </section>

      {status?.acuteLoad != null && status?.chronicLoad != null && (
        <section className={styles.loadSection}>
          <h3>Charge d'entraînement</h3>
          <div className={styles.loadRatio}>
            <span>Charge aiguë / chronique</span>
            <strong style={{ color: getLoadRatioColor(status.acuteLoad / status.chronicLoad) }}>
              {(status.acuteLoad / status.chronicLoad).toFixed(2)}
            </strong>
          </div>
        </section>
      )}

      {status?.aiRecommendation && (
        <section className={styles.aiCard}>
          <div className={styles.aiHeader}>
            <span className={styles.aiIcon}>🤖</span>
            <span>Recommandation coach</span>
          </div>
          <p>{status.aiRecommendation}</p>
        </section>
      )}
    </div>
  )
}

function MetricCard({ label, value, unit, color }: { label: string; value: number | null | undefined; unit: string; color?: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue} style={{ color: color || 'var(--text-primary)' }}>
        {value != null ? value : '—'}
      </span>
      <span className={styles.metricUnit}>{unit}</span>
    </div>
  )
}

function getHrvColor(hrv: number | null | undefined) {
  if (!hrv) return undefined
  if (hrv >= 50) return 'var(--success)'
  if (hrv >= 30) return 'var(--warning)'
  return 'var(--danger)'
}

function getBatteryColor(bb: number | null | undefined) {
  if (!bb) return undefined
  if (bb >= 60) return 'var(--success)'
  if (bb >= 30) return 'var(--warning)'
  return 'var(--danger)'
}

function getSleepColor(score: number | null | undefined) {
  if (!score) return undefined
  if (score >= 70) return 'var(--success)'
  if (score >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

function getLoadRatioColor(ratio: number) {
  if (ratio > 1.5) return 'var(--danger)'
  if (ratio > 1.3) return 'var(--warning)'
  return 'var(--success)'
}
