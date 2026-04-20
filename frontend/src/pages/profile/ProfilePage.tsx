import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { apiGet, apiPatch } from '@/lib/api'
import { GarminConnectButton } from '@/components/garmin/GarminConnectButton'
import styles from './ProfilePage.module.css'

interface DeviceStatus {
  provider: string
  connected: boolean
  lastSync: string | null
}

interface ProactiveAlert {
  id: string
  date: string
  type: string
  content: string
}

export function ProfilePage() {
  const { user, signOut } = useAuthStore()
  const { profile, fetchProfile } = useProfileStore()
  const [devices, setDevices] = useState<DeviceStatus[]>([])
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([])
  const [ftp, setFtp] = useState(profile?.ftp_watts?.toString() ?? '')
  const [vo2max, setVo2max] = useState(profile?.vo2max?.toString() ?? '')
  const [restingHr, setRestingHr] = useState(profile?.resting_hr?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/garmin/status').then(s => ([{ provider: 'Garmin', connected: s.connected, lastSync: s.lastSync }])),
      apiGet<ProactiveAlert[]>('/api/coach/proactive'),
    ]).then(([devs, a]) => {
      setDevices(devs as DeviceStatus[])
      setAlerts(a.slice(0, 5))
    }).catch(console.error)
  }, [])

  async function saveMetrics() {
    setSaving(true)
    await apiPatch('/api/profile/preferences', {
      ftpWatts: ftp ? parseInt(ftp) : undefined,
      vo2max: vo2max ? parseFloat(vo2max) : undefined,
      restingHr: restingHr ? parseInt(restingHr) : undefined,
    })
    await fetchProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const garminConnected = devices.find(d => d.provider === 'Garmin')?.connected ?? false

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>{profile?.first_name?.[0]?.toUpperCase() ?? '?'}</div>
        <div>
          <h1>{profile?.first_name ?? 'Profil'}</h1>
          <p className={styles.email}>{user?.email}</p>
        </div>
      </header>

      {/* Infos profil */}
      <section className={styles.section}>
        <h2>Profil sportif</h2>
        <div className={styles.infoGrid}>
          <InfoRow label="Sports" value={profile?.sports?.join(', ') ?? '—'} />
          <InfoRow label="Niveau" value={levelLabel(profile?.level)} />
          <InfoRow label="Objectifs" value={profile?.goals?.join(', ') ?? '—'} />
          {profile?.age && <InfoRow label="Âge" value={`${profile.age} ans`} />}
          {profile?.weight_kg && <InfoRow label="Poids" value={`${profile.weight_kg} kg`} />}
          {profile?.height_cm && <InfoRow label="Taille" value={`${profile.height_cm} cm`} />}
        </div>
      </section>

      {/* Métriques de référence */}
      <section className={styles.section}>
        <h2>Métriques de référence</h2>
        <div className={styles.metricsInputs}>
          <MetricInput label="FTP" value={ftp} onChange={setFtp} unit="W" placeholder="—" type="number" />
          <MetricInput label="VO2 max" value={vo2max} onChange={setVo2max} unit="ml/kg/min" placeholder="—" type="number" />
          <MetricInput label="FC repos" value={restingHr} onChange={setRestingHr} unit="bpm" placeholder="—" type="number" />
        </div>
        <button
          className={styles.btnSave}
          onClick={saveMetrics}
          disabled={saving}
        >
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Mettre à jour'}
        </button>
      </section>

      {/* Appareils */}
      <section className={styles.section}>
        <h2>Appareils connectés</h2>
        <div className={styles.devicesList}>
          <div className={styles.deviceRow}>
            <div className={styles.deviceInfo}>
              <span className={styles.deviceIcon}>⌚</span>
              <span className={styles.deviceName}>Garmin</span>
            </div>
            {garminConnected
              ? <span className={styles.connected}>Connecté ✓</span>
              : <GarminConnectButton onConnected={() => setDevices(prev => prev.map(d => d.provider === 'Garmin' ? { ...d, connected: true } : d))} />
            }
          </div>
          {['Wahoo', 'Apple Health', 'Polar'].map(provider => (
            <div key={provider} className={styles.deviceRow}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceIcon}>📡</span>
                <span className={styles.deviceName}>{provider}</span>
              </div>
              <span className={styles.comingSoon}>Bientôt</span>
            </div>
          ))}
        </div>
      </section>

      {/* Conseils proactifs récents */}
      {alerts.length > 0 && (
        <section className={styles.section}>
          <h2>Alertes coach récentes</h2>
          <div className={styles.alertsList}>
            {alerts.map(a => (
              <div key={a.id} className={styles.alertItem}>
                <span className={styles.alertDate}>{new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                <p className={styles.alertContent}>{a.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className={styles.btnSignOut} onClick={signOut}>
        Se déconnecter
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  )
}

function MetricInput({
  label, value, onChange, unit, placeholder, type,
}: {
  label: string; value: string; onChange: (v: string) => void
  unit: string; placeholder: string; type: string
}) {
  return (
    <div className={styles.metricInput}>
      <label>{label}</label>
      <div className={styles.metricInputRow}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
        />
        <span>{unit}</span>
      </div>
    </div>
  )
}

function levelLabel(level?: string | null): string {
  const map: Record<string, string> = {
    beginner: 'Débutant', intermediate: 'Intermédiaire',
    advanced: 'Avancé', competitor: 'Compétiteur',
  }
  return map[level ?? ''] ?? '—'
}
