import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { GarminConnectButton } from '@/components/garmin/GarminConnectButton'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { DEMO_MODE } from '@/lib/demo'
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
  const push = usePushNotifications()
  const [devices, setDevices] = useState<DeviceStatus[]>([
    { provider: 'Garmin', connected: false, lastSync: null },
    { provider: 'Wahoo', connected: false, lastSync: null },
    { provider: 'Apple Health', connected: false, lastSync: null },
  ])
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([])
  const [ftp, setFtp] = useState(profile?.ftp_watts?.toString() ?? '')
  const [vo2max, setVo2max] = useState(profile?.vo2max?.toString() ?? '')
  const [restingHr, setRestingHr] = useState(profile?.resting_hr?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wahooLoading, setWahooLoading] = useState(false)
  const [appleImporting, setAppleImporting] = useState(false)
  const appleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/garmin/status'),
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/wahoo/status').catch(() => ({ connected: false, lastSync: null })),
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/apple/status').catch(() => ({ connected: false, lastSync: null })),
      apiGet<ProactiveAlert[]>('/api/coach/proactive'),
    ]).then(([garmin, wahoo, apple, a]) => {
      setDevices([
        { provider: 'Garmin', connected: garmin.connected, lastSync: garmin.lastSync },
        { provider: 'Wahoo', connected: wahoo.connected, lastSync: wahoo.lastSync },
        { provider: 'Apple Health', connected: apple.connected, lastSync: apple.lastSync },
      ])
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

  async function connectWahoo() {
    if (DEMO_MODE) {
      setDevices(prev => prev.map(d => d.provider === 'Wahoo' ? { ...d, connected: true, lastSync: new Date().toISOString() } : d))
      return
    }
    setWahooLoading(true)
    try {
      const { authorizeUrl } = await apiGet<{ authorizeUrl: string }>('/api/wahoo/oauth/start')
      window.open(authorizeUrl, 'wahoo-auth', 'width=600,height=700')
      setTimeout(async () => {
        const status = await apiGet<{ connected: boolean; lastSync: string | null }>('/api/wahoo/status')
        setDevices(prev => prev.map(d => d.provider === 'Wahoo' ? { ...d, ...status } : d))
        setWahooLoading(false)
      }, 5000)
    } catch { setWahooLoading(false) }
  }

  async function importAppleHealth(file: File) {
    setAppleImporting(true)
    try {
      const text = await file.text()
      let workouts = []
      try { workouts = JSON.parse(text).workouts ?? JSON.parse(text) } catch {}
      const result = await apiPost<{ imported: number; duplicates: number }>('/api/apple/sync', { workouts })
      setDevices(prev => prev.map(d =>
        d.provider === 'Apple Health' ? { ...d, connected: true, lastSync: new Date().toISOString() } : d
      ))
      alert(`✓ ${result.imported} activité(s) importée(s), ${result.duplicates} doublon(s) ignoré(s).`)
    } catch (e) {
      alert('Erreur lors de l\'import. Vérifiez le format du fichier JSON.')
    } finally {
      setAppleImporting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>{profile?.first_name?.[0]?.toUpperCase() ?? '?'}</div>
        <div>
          <h1>{profile?.first_name ?? 'Profil'}</h1>
          <p className={styles.email}>{user?.email}</p>
        </div>
      </header>

      {/* Profil sportif */}
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

      {/* Métriques */}
      <section className={styles.section}>
        <h2>Métriques de référence</h2>
        <div className={styles.metricsInputs}>
          <MetricInput label="FTP" value={ftp} onChange={setFtp} unit="W" placeholder="—" type="number" />
          <MetricInput label="VO2 max" value={vo2max} onChange={setVo2max} unit="ml/kg/min" placeholder="—" type="number" />
          <MetricInput label="FC repos" value={restingHr} onChange={setRestingHr} unit="bpm" placeholder="—" type="number" />
        </div>
        <button className={styles.btnSave} onClick={saveMetrics} disabled={saving}>
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Mettre à jour'}
        </button>
      </section>

      {/* Notifications push */}
      {push.supported && (
        <section className={styles.section}>
          <h2>Notifications</h2>
          <div className={styles.notifRow}>
            <div className={styles.notifInfo}>
              <span className={styles.notifIcon}>🔔</span>
              <div>
                <p className={styles.notifTitle}>Alertes entraînement</p>
                <p className={styles.notifDesc}>Bilan matin, rappel séance, conseils proactifs</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${push.subscribed ? styles.toggleOn : ''}`}
              onClick={push.subscribed ? push.unsubscribe : push.subscribe}
              disabled={push.loading || push.permission === 'denied'}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
          {push.permission === 'denied' && (
            <p className={styles.notifDenied}>Notifications bloquées dans les réglages du navigateur.</p>
          )}
        </section>
      )}

      {/* Appareils */}
      <section className={styles.section}>
        <h2>Appareils connectés</h2>
        <div className={styles.devicesList}>
          {/* Garmin */}
          <div className={styles.deviceRow}>
            <div className={styles.deviceInfo}>
              <span className={styles.deviceIcon}>⌚</span>
              <div>
                <span className={styles.deviceName}>Garmin</span>
                {devices[0].lastSync && (
                  <span className={styles.deviceSync}>
                    Sync {new Date(devices[0].lastSync).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            {devices[0].connected
              ? <span className={styles.connected}>Connecté ✓</span>
              : <GarminConnectButton onConnected={() => setDevices(prev => prev.map(d => d.provider === 'Garmin' ? { ...d, connected: true } : d))} />
            }
          </div>

          {/* Wahoo */}
          <div className={styles.deviceRow}>
            <div className={styles.deviceInfo}>
              <span className={styles.deviceIcon}>🚴</span>
              <div>
                <span className={styles.deviceName}>Wahoo</span>
                {devices[1].lastSync && (
                  <span className={styles.deviceSync}>
                    Sync {new Date(devices[1].lastSync).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            {devices[1].connected
              ? <span className={styles.connected}>Connecté ✓</span>
              : <button className={styles.btnConnect} onClick={connectWahoo} disabled={wahooLoading}>
                  {wahooLoading ? '…' : '🔗 Wahoo'}
                </button>
            }
          </div>

          {/* Apple Health */}
          <div className={styles.deviceRow}>
            <div className={styles.deviceInfo}>
              <span className={styles.deviceIcon}>🍎</span>
              <div>
                <span className={styles.deviceName}>Apple Health</span>
                <span className={styles.deviceSync}>Import JSON via Raccourcis iOS</span>
              </div>
            </div>
            <div>
              <input
                ref={appleInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && importAppleHealth(e.target.files[0])}
              />
              {devices[2].connected
                ? <button className={styles.btnConnect} onClick={() => appleInputRef.current?.click()}>
                    🔄 Réimporter
                  </button>
                : <button
                    className={styles.btnConnect}
                    onClick={() => appleInputRef.current?.click()}
                    disabled={appleImporting}
                  >
                    {appleImporting ? '…' : '📥 Importer'}
                  </button>
              }
            </div>
          </div>

          {/* Polar / Suunto (bientôt) */}
          {['Polar', 'Suunto', 'Whoop', 'Oura Ring'].map(provider => (
            <div key={provider} className={styles.deviceRow}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceIcon}>📡</span>
                <span className={styles.deviceName}>{provider}</span>
              </div>
              <span className={styles.comingSoon}>Bientôt</span>
            </div>
          ))}
        </div>

        <div className={styles.dedupNote}>
          <span>ℹ</span>
          <p>Si une activité est présente sur plusieurs appareils, on garde automatiquement la source la plus précise (Garmin {'>'} Wahoo {'>'} Apple Health).</p>
        </div>
      </section>

      {/* Conseils proactifs */}
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

      <button className={styles.btnSignOut} onClick={signOut}>Se déconnecter</button>
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
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode="numeric" />
        <span>{unit}</span>
      </div>
    </div>
  )
}

function levelLabel(level?: string | null): string {
  const map: Record<string, string> = {
    beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', competitor: 'Compétiteur',
  }
  return map[level ?? ''] ?? '—'
}
