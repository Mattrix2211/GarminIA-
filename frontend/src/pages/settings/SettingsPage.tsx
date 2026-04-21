import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { GarminConnectButton } from '@/components/garmin/GarminConnectButton'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { DEMO_MODE } from '@/lib/demo'
import {
  IconChevronRight, IconUser, IconBell, IconTarget, IconActivity,
  IconWatch, IconBike, IconApple, IconDatabase, IconShield, IconTrash,
  IconDownload, IconBrain, IconWifi,
} from '@/components/ui/Icons'
import styles from './SettingsPage.module.css'

interface DeviceStatus {
  provider: string; connected: boolean; lastSync: string | null
}

export function SettingsPage() {
  const { user, signOut } = useAuthStore()
  const { profile, fetchProfile } = useProfileStore()
  const push = usePushNotifications()

  const [devices, setDevices] = useState<DeviceStatus[]>([
    { provider: 'Garmin', connected: false, lastSync: null },
    { provider: 'Wahoo', connected: false, lastSync: null },
    { provider: 'Apple Health', connected: false, lastSync: null },
  ])
  const [metrics, setMetrics] = useState({
    ftp: profile?.ftp_watts?.toString() ?? '',
    vo2max: profile?.vo2max?.toString() ?? '',
    restingHr: profile?.resting_hr?.toString() ?? '',
  })
  const [coachTone, setCoachTone] = useState<'bienveillant' | 'exigeant' | 'factuel'>('bienveillant')
  const [coachDetail, setCoachDetail] = useState<'detaille' | 'synthetique'>('detaille')
  const [notifMorning, setNotifMorning] = useState(true)
  const [notifSession, setNotifSession] = useState(true)
  const [notifProactive, setNotifProactive] = useState(true)
  const [morningTime, setMorningTime] = useState('07:00')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wahooLoading, setWahooLoading] = useState(false)
  const [appleImporting, setAppleImporting] = useState(false)
  const appleInputRef = useRef<HTMLInputElement>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('devices')

  useEffect(() => {
    setMetrics({
      ftp: profile?.ftp_watts?.toString() ?? '',
      vo2max: profile?.vo2max?.toString() ?? '',
      restingHr: profile?.resting_hr?.toString() ?? '',
    })
  }, [profile])

  useEffect(() => {
    Promise.all([
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/garmin/status'),
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/wahoo/status').catch(() => ({ connected: false, lastSync: null })),
      apiGet<{ connected: boolean; lastSync: string | null }>('/api/apple/status').catch(() => ({ connected: false, lastSync: null })),
    ]).then(([g, w, a]) => {
      setDevices([
        { provider: 'Garmin', connected: g.connected, lastSync: g.lastSync },
        { provider: 'Wahoo', connected: w.connected, lastSync: w.lastSync },
        { provider: 'Apple Health', connected: a.connected, lastSync: a.lastSync },
      ])
    }).catch(console.error)
  }, [])

  function toggle(section: string) {
    setExpandedSection(s => s === section ? null : section)
  }

  async function saveMetrics() {
    setSaving(true)
    await apiPatch('/api/profile/preferences', {
      ftpWatts: metrics.ftp ? parseInt(metrics.ftp) : undefined,
      vo2max: metrics.vo2max ? parseFloat(metrics.vo2max) : undefined,
      restingHr: metrics.restingHr ? parseInt(metrics.restingHr) : undefined,
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
        const s = await apiGet<{ connected: boolean; lastSync: string | null }>('/api/wahoo/status')
        setDevices(prev => prev.map(d => d.provider === 'Wahoo' ? { ...d, ...s } : d))
        setWahooLoading(false)
      }, 5000)
    } catch { setWahooLoading(false) }
  }

  async function importAppleHealth(file: File) {
    setAppleImporting(true)
    try {
      const text = await file.text()
      let workouts = []
      try { workouts = JSON.parse(text).workouts ?? JSON.parse(text) } catch { /* invalid json */ }
      const result = await apiPost<{ imported: number; duplicates: number }>('/api/apple/sync', { workouts })
      setDevices(prev => prev.map(d => d.provider === 'Apple Health' ? { ...d, connected: true, lastSync: new Date().toISOString() } : d))
      alert(`${result.imported} activité(s) importée(s) · ${result.duplicates} doublon(s) ignoré(s)`)
    } catch {
      alert('Format invalide. Exporte un fichier JSON depuis l\'app Raccourcis iOS.')
    } finally {
      setAppleImporting(false)
    }
  }

  const garmin = devices[0]
  const wahoo = devices[1]
  const apple = devices[2]
  const initials = profile?.first_name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Réglages</h1>
      </header>

      {/* Compte */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <IconUser size={12} color="var(--text-muted)" />
          <span>Compte</span>
        </div>
        <div className={styles.card}>
          <div className={styles.accountRow}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.accountInfo}>
              <span className={styles.accountName}>{profile?.first_name ?? 'Athlete'}</span>
              <span className={styles.accountEmail}>{user?.email}</span>
            </div>
            <Link to="/profile" className={styles.rowAction}>
              <IconChevronRight size={16} color="var(--text-muted)" />
            </Link>
          </div>
        </div>
      </section>

      {/* Métriques */}
      <section className={styles.section}>
        <button
          className={styles.sectionLabel}
          onClick={() => toggle('metrics')}
        >
          <IconActivity size={12} color="var(--text-muted)" />
          <span>Métriques de performance</span>
          <IconChevronRight
            size={12}
            color="var(--text-muted)"
            className={`${styles.sectionChevron} ${expandedSection === 'metrics' ? styles.open : ''}`}
          />
        </button>
        <div className={styles.card}>
          <MetricRow
            label="FTP"
            value={metrics.ftp}
            unit="W"
            placeholder="—"
            onChange={v => setMetrics(m => ({ ...m, ftp: v }))}
          />
          <div className={styles.rowDivider} />
          <MetricRow
            label="VO₂ max"
            value={metrics.vo2max}
            unit="ml/kg/min"
            placeholder="—"
            onChange={v => setMetrics(m => ({ ...m, vo2max: v }))}
          />
          <div className={styles.rowDivider} />
          <MetricRow
            label="FC repos"
            value={metrics.restingHr}
            unit="bpm"
            placeholder="—"
            onChange={v => setMetrics(m => ({ ...m, restingHr: v }))}
          />
          <div className={styles.rowDivider} />
          <div className={styles.saveRow}>
            <button
              className={`${styles.btnSave} ${saved ? styles.btnSaved : ''}`}
              onClick={saveMetrics}
              disabled={saving}
            >
              {saved ? '✓ Enregistré' : saving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </section>

      {/* Appareils */}
      <section className={styles.section}>
        <button
          className={styles.sectionLabel}
          onClick={() => toggle('devices')}
        >
          <IconWifi size={12} color="var(--text-muted)" />
          <span>Appareils connectés</span>
          <IconChevronRight
            size={12}
            color="var(--text-muted)"
            className={`${styles.sectionChevron} ${expandedSection === 'devices' ? styles.open : ''}`}
          />
        </button>
        <div className={styles.card}>
          {/* Garmin */}
          <DeviceRow
            icon={<IconWatch size={18} color="#c8f064" />}
            iconBg="rgba(200,240,100,0.1)"
            name="Garmin"
            sub={garmin.connected ? formatSync(garmin.lastSync) : 'HRV · Body Battery · Sommeil · Activités'}
            connected={garmin.connected}
            action={
              garmin.connected
                ? <StatusBadge label="Connecté" />
                : <GarminConnectButton onConnected={() => setDevices(prev => prev.map(d => d.provider === 'Garmin' ? { ...d, connected: true } : d))} />
            }
          />
          <div className={styles.rowDivider} />
          {/* Wahoo */}
          <DeviceRow
            icon={<IconBike size={18} color="#ff7c5c" />}
            iconBg="rgba(255,124,92,0.1)"
            name="Wahoo"
            sub={wahoo.connected ? formatSync(wahoo.lastSync) : 'Home trainer · Puissance · Capteurs'}
            connected={wahoo.connected}
            action={
              wahoo.connected
                ? <StatusBadge label="Connecté" />
                : <button className={styles.btnDevice} onClick={connectWahoo} disabled={wahooLoading}>
                    {wahooLoading ? '…' : 'Connecter'}
                  </button>
            }
          />
          <div className={styles.rowDivider} />
          {/* Apple Health */}
          <DeviceRow
            icon={<IconApple size={18} color="#55cccc" />}
            iconBg="rgba(85,204,204,0.1)"
            name="Apple Health"
            sub={apple.connected ? formatSync(apple.lastSync) : 'Import JSON via Raccourcis iOS'}
            connected={apple.connected}
            action={
              <div>
                <input
                  ref={appleInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && importAppleHealth(e.target.files[0])}
                />
                <button
                  className={styles.btnDevice}
                  onClick={() => appleInputRef.current?.click()}
                  disabled={appleImporting}
                >
                  {appleImporting ? '…' : apple.connected ? 'Ré-importer' : 'Importer'}
                </button>
              </div>
            }
          />
          <div className={styles.rowDivider} />
          {/* Bientôt */}
          {[
            { name: 'Polar', color: '#ff5555', bg: 'rgba(255,85,85,0.1)' },
            { name: 'Suunto', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
            { name: 'Whoop', color: '#ffaa33', bg: 'rgba(255,170,51,0.1)' },
            { name: 'Oura Ring', color: '#a0a0a0', bg: 'rgba(160,160,160,0.08)' },
          ].map((d, i) => (
            <div key={d.name}>
              {i > 0 && <div className={styles.rowDivider} />}
              <DeviceRow
                icon={<IconWifi size={18} color={d.color} />}
                iconBg={d.bg}
                name={d.name}
                sub="Intégration en cours de développement"
                connected={false}
                action={<span className={styles.comingSoon}>Bientôt</span>}
              />
            </div>
          ))}

          <div className={styles.dedupNote}>
            <IconShield size={13} color="#6c63ff" />
            <p>Déduplication automatique : si une activité existe sur plusieurs sources, on garde la plus précise — Garmin › Wahoo › Apple Health.</p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className={styles.section}>
        <button className={styles.sectionLabel} onClick={() => toggle('notifs')}>
          <IconBell size={12} color="var(--text-muted)" />
          <span>Notifications</span>
          <IconChevronRight
            size={12}
            color="var(--text-muted)"
            className={`${styles.sectionChevron} ${expandedSection === 'notifs' ? styles.open : ''}`}
          />
        </button>
        <div className={styles.card}>
          {push.supported ? (
            <>
              <ToggleRow
                label="Alertes push"
                sub="Activer toutes les notifications"
                checked={push.subscribed}
                onChange={push.subscribed ? push.unsubscribe : push.subscribe}
                disabled={push.loading || push.permission === 'denied'}
              />
              {push.permission === 'denied' && (
                <p className={styles.permDenied}>Notifications bloquées dans les réglages navigateur.</p>
              )}
              {push.subscribed && (
                <>
                  <div className={styles.rowDivider} />
                  <ToggleRow
                    label="Bilan matin"
                    sub={`Analyse IA chaque matin`}
                    checked={notifMorning}
                    onChange={() => setNotifMorning(v => !v)}
                    aside={
                      <input
                        type="time"
                        value={morningTime}
                        onChange={e => setMorningTime(e.target.value)}
                        className={styles.timeInput}
                      />
                    }
                  />
                  <div className={styles.rowDivider} />
                  <ToggleRow
                    label="Rappel séance"
                    sub="30 min avant l'heure planifiée"
                    checked={notifSession}
                    onChange={() => setNotifSession(v => !v)}
                  />
                  <div className={styles.rowDivider} />
                  <ToggleRow
                    label="Conseils proactifs"
                    sub="Alertes HRV basse, charge excessive…"
                    checked={notifProactive}
                    onChange={() => setNotifProactive(v => !v)}
                  />
                </>
              )}
            </>
          ) : (
            <div className={styles.notSupported}>Notifications non supportées sur ce navigateur.</div>
          )}
        </div>
      </section>

      {/* Coaching IA */}
      <section className={styles.section}>
        <button className={styles.sectionLabel} onClick={() => toggle('ai')}>
          <IconBrain size={12} color="var(--text-muted)" />
          <span>Coaching IA</span>
          <IconChevronRight
            size={12}
            color="var(--text-muted)"
            className={`${styles.sectionChevron} ${expandedSection === 'ai' ? styles.open : ''}`}
          />
        </button>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.rowLabel}>
              <span className={styles.rowTitle}>Ton du coach</span>
              <span className={styles.rowSub}>Style des réponses IA</span>
            </div>
            <div className={styles.segmented}>
              {(['bienveillant', 'exigeant', 'factuel'] as const).map(t => (
                <button
                  key={t}
                  className={`${styles.seg} ${coachTone === t ? styles.segActive : ''}`}
                  onClick={() => setCoachTone(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.rowDivider} />
          <div className={styles.settingRow}>
            <div className={styles.rowLabel}>
              <span className={styles.rowTitle}>Niveau de détail</span>
              <span className={styles.rowSub}>Longueur des analyses</span>
            </div>
            <div className={styles.segmented}>
              {(['detaille', 'synthetique'] as const).map(t => (
                <button
                  key={t}
                  className={`${styles.seg} ${coachDetail === t ? styles.segActive : ''}`}
                  onClick={() => setCoachDetail(t)}
                >
                  {t === 'detaille' ? 'Détaillé' : 'Synthétique'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sports & Objectifs */}
      <section className={styles.section}>
        <button className={styles.sectionLabel} onClick={() => toggle('sports')}>
          <IconTarget size={12} color="var(--text-muted)" />
          <span>Sports & Objectifs</span>
          <IconChevronRight
            size={12}
            color="var(--text-muted)"
            className={`${styles.sectionChevron} ${expandedSection === 'sports' ? styles.open : ''}`}
          />
        </button>
        <div className={styles.card}>
          <ValueRow label="Sports" value={profile?.sports?.join(', ') ?? '—'} />
          <div className={styles.rowDivider} />
          <ValueRow label="Niveau" value={levelLabel(profile?.level)} />
          <div className={styles.rowDivider} />
          <ValueRow label="Objectifs" value={profile?.goals?.join(', ') ?? '—'} />
          {profile?.target_competition_date && (
            <>
              <div className={styles.rowDivider} />
              <ValueRow
                label="Compétition cible"
                value={new Date(profile.target_competition_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                accent
              />
            </>
          )}
        </div>
      </section>

      {/* Données */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <IconDatabase size={12} color="var(--text-muted)" />
          <span>Données</span>
        </div>
        <div className={styles.card}>
          <button className={styles.actionRow} onClick={() => alert('Export en cours de développement')}>
            <IconDownload size={16} color="var(--text-secondary)" />
            <span className={styles.actionLabel}>Exporter mes données</span>
            <IconChevronRight size={14} color="var(--text-muted)" />
          </button>
          <div className={styles.rowDivider} />
          <button className={styles.actionRow} style={{ color: 'var(--danger)' }} onClick={() => {
            if (confirm('Supprimer définitivement ton compte et toutes tes données ?')) signOut()
          }}>
            <IconTrash size={16} color="var(--danger)" />
            <span className={styles.actionLabel} style={{ color: 'var(--danger)' }}>Supprimer mon compte</span>
            <IconChevronRight size={14} color="var(--danger)" />
          </button>
        </div>
      </section>

      {/* Footer version */}
      <div className={styles.footer}>
        <span>GarminIA v1.0</span>
        <span>·</span>
        <span>claude-sonnet-4-6</span>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricRow({ label, value, unit, placeholder, onChange }: {
  label: string; value: string; unit: string; placeholder: string; onChange: (v: string) => void
}) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.rowTitle}>{label}</span>
      <div className={styles.metricInput}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
          className={styles.metricField}
        />
        <span className={styles.metricUnit}>{unit}</span>
      </div>
    </div>
  )
}

function DeviceRow({ icon, iconBg, name, sub, connected, action }: {
  icon: React.ReactNode; iconBg: string; name: string; sub: string; connected: boolean; action: React.ReactNode
}) {
  return (
    <div className={styles.deviceRow}>
      <div className={styles.deviceIconWrap} style={{ background: iconBg }}>
        {icon}
      </div>
      <div className={styles.deviceInfo}>
        <span className={styles.rowTitle}>{name}</span>
        <span className={`${styles.rowSub} ${connected ? styles.rowSubConnected : ''}`}>{sub}</span>
      </div>
      <div className={styles.deviceAction}>{action}</div>
    </div>
  )
}

function StatusBadge({ label }: { label: string }) {
  return (
    <div className={styles.statusBadge}>
      <span className={styles.statusDot} />
      <span>{label}</span>
    </div>
  )
}

function ToggleRow({ label, sub, checked, onChange, disabled, aside }: {
  label: string; sub: string; checked: boolean; onChange: () => void; disabled?: boolean; aside?: React.ReactNode
}) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.rowLabel}>
        <span className={styles.rowTitle}>{label}</span>
        <span className={styles.rowSub}>{sub}</span>
      </div>
      <div className={styles.toggleRight}>
        {aside}
        <button
          className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
          onClick={onChange}
          disabled={disabled}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>
    </div>
  )
}

function ValueRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.settingRow}>
      <span className={styles.rowTitle}>{label}</span>
      <span className={`${styles.rowValue} ${accent ? styles.rowValueAccent : ''}`}>{value}</span>
    </div>
  )
}

function levelLabel(level?: string | null): string {
  const map: Record<string, string> = {
    beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', competitor: 'Compétiteur',
  }
  return map[level ?? ''] ?? '—'
}

function formatSync(date: string | null): string {
  if (!date) return ''
  return `Sync ${new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
}
