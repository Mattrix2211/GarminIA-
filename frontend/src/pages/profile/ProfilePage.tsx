import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { apiGet } from '@/lib/api'
import { IconGear, IconActivity, IconTarget, IconMoon, IconChevronRight } from '@/components/ui/Icons'
import styles from './ProfilePage.module.css'

interface ProactiveAlert {
  id: string; date: string; type: string; content: string
}

interface WeekStats {
  sessionsCount: number; totalDurationMin: number; avgMood: number
}

export function ProfilePage() {
  const { user, signOut } = useAuthStore()
  const { profile } = useProfileStore()
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([])
  const [garminConnected, setGarminConnected] = useState(false)
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<ProactiveAlert[]>('/api/coach/proactive'),
      apiGet<{ connected: boolean }>('/api/garmin/status'),
      apiGet<WeekStats[]>('/api/stats/weekly'),
    ]).then(([a, g, weekly]) => {
      setAlerts(a.filter(x => x.type === 'proactive').slice(0, 3))
      setGarminConnected(g.connected)
      setWeekStats(weekly?.[weekly.length - 1] ?? null)
    }).catch(console.error)
  }, [])

  const initials = (profile?.first_name ?? user?.email ?? '?')[0].toUpperCase()
  const daysToComp = profile?.target_competition_date
    ? Math.max(0, Math.round((new Date(profile.target_competition_date).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className={styles.page}>
      {/* Hero athlète */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.avatarRing}>
          <div className={styles.avatar}>{initials}</div>
          {garminConnected && <span className={styles.syncDot} title="Garmin connecté" />}
        </div>
        <h1 className={styles.name}>{profile?.first_name ?? 'Athlete'}</h1>
        <p className={styles.level}>{levelLabel(profile?.level)} · {profile?.sports?.slice(0, 2).join(' · ') ?? '—'}</p>

        <Link to="/settings" className={styles.settingsBtn}>
          <IconGear size={16} color="var(--text-muted)" />
          <span>Réglages</span>
        </Link>
      </div>

      {/* Stats rapides */}
      <div className={styles.statsRow}>
        <StatCard
          icon={<IconActivity size={16} color="var(--accent)" />}
          label="Cette semaine"
          value={weekStats ? `${weekStats.sessionsCount} séance${weekStats.sessionsCount !== 1 ? 's' : ''}` : '—'}
          sub={weekStats ? `${Math.round(weekStats.totalDurationMin / 60)}h de travail` : ''}
        />
        {profile?.ftp_watts && (
          <StatCard
            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10L5.5 4.5L8 8L10.5 6L14 10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="FTP"
            value={`${profile.ftp_watts} W`}
            sub="Dernière mesure"
          />
        )}
        {daysToComp !== null && (
          <StatCard
            icon={<IconTarget size={16} color="var(--accent)" />}
            label="Compétition"
            value={`J-${daysToComp}`}
            sub={new Date(profile!.target_competition_date!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            accent
          />
        )}
      </div>

      {/* Métriques de forme */}
      {(profile?.vo2max || profile?.resting_hr) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profil physiologique</h2>
          <div className={styles.physioGrid}>
            {profile?.vo2max && (
              <PhysioCard label="VO₂ max" value={profile.vo2max.toString()} unit="ml/kg/min" color="var(--success)" />
            )}
            {profile?.resting_hr && (
              <PhysioCard label="FC repos" value={profile.resting_hr.toString()} unit="bpm" color="#6c63ff" />
            )}
            {profile?.ftp_watts && (
              <PhysioCard label="FTP" value={profile.ftp_watts.toString()} unit="W" color="var(--accent)" />
            )}
          </div>
        </section>
      )}

      {/* Alertes coach */}
      {alerts.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dernières alertes</h2>
          <div className={styles.alertsList}>
            {alerts.map(a => (
              <div key={a.id} className={styles.alertItem}>
                <div className={styles.alertDot} />
                <div className={styles.alertBody}>
                  <span className={styles.alertDate}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  <p className={styles.alertContent}>{a.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Liens rapides vers réglages */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Accès rapide</h2>
        <div className={styles.quickLinks}>
          <Link to="/settings" className={styles.quickLink}>
            <IconGear size={18} color="var(--text-secondary)" />
            <span>Réglages & Appareils</span>
            <IconChevronRight size={14} color="var(--text-muted)" />
          </Link>
          <Link to="/stats" className={styles.quickLink}>
            <IconActivity size={18} color="var(--text-secondary)" />
            <span>Statistiques détaillées</span>
            <IconChevronRight size={14} color="var(--text-muted)" />
          </Link>
          <Link to="/chat" className={styles.quickLink}>
            <IconMoon size={18} color="var(--text-secondary)" />
            <span>Parler à mon coach</span>
            <IconChevronRight size={14} color="var(--text-muted)" />
          </Link>
        </div>
      </section>

      <button className={styles.btnSignOut} onClick={signOut}>
        Se déconnecter
      </button>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean
}) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statCardAccent : ''}`}>
      {icon}
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  )
}

function PhysioCard({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string
}) {
  return (
    <div className={styles.physioCard}>
      <div className={styles.physioBar} style={{ background: color }} />
      <span className={styles.physioLabel}>{label}</span>
      <span className={styles.physioValue} style={{ color }}>{value}</span>
      <span className={styles.physioUnit}>{unit}</span>
    </div>
  )
}

function levelLabel(level?: string | null): string {
  const map: Record<string, string> = {
    beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', competitor: 'Compétiteur',
  }
  return map[level ?? ''] ?? '—'
}
