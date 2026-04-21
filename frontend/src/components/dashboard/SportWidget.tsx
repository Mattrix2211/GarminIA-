import styles from './SportWidget.module.css'

interface Profile {
  ftp_watts?: number | null
  vo2max?: number | null
  resting_hr?: number | null
  sports?: string[]
}

interface Session {
  sport: string
  durationMin?: number | null
  title: string
}

interface Props {
  profile: Profile | null
  todaySessions: Session[]
  hrv?: number | null
  bodyBattery?: number | null
  minimal?: boolean
}

export function SportWidget({ profile, todaySessions, hrv, bodyBattery, minimal }: Props) {
  const primarySport = todaySessions[0]?.sport ?? profile?.sports?.[0]
  if (!primarySport) return null

  if (minimal) {
    const { color, label } = getIntensityFromRecovery(hrv, bodyBattery)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{primarySport}</span>
        <span style={{ fontSize: '0.8rem', color, marginLeft: 'auto' }}>{label}</span>
      </div>
    )
  }

  const common = { profile, hrv, bodyBattery }

  switch (primarySport) {
    case 'Cyclisme':
    case 'Triathlon':
      return <CyclingWidget {...common} session={todaySessions[0]} />
    case 'Course à pied':
      return <RunningWidget {...common} session={todaySessions[0]} />
    case 'Trail':
      return <TrailWidget {...common} session={todaySessions[0]} />
    case 'Natation':
      return <SwimmingWidget session={todaySessions[0]} />
    case 'Musculation':
      return <StrengthWidget session={todaySessions[0]} />
    case 'CrossFit':
      return <CrossFitWidget session={todaySessions[0]} />
    default:
      return null
  }
}

// ─── Cyclisme ─────────────────────────────────────────────────────────────────

function CyclingWidget({ profile, hrv, bodyBattery, session }: {
  profile: Profile | null; hrv?: number | null; bodyBattery?: number | null; session?: Session
}) {
  const ftp = profile?.ftp_watts ?? 250
  const zones = computePowerZones(ftp)
  const recommendation = getIntensityFromRecovery(hrv, bodyBattery)

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.sportIcon}>🚴</span>
        <div>
          <h3 className={styles.widgetTitle}>Zones de puissance — FTP {ftp}W</h3>
          <p className={styles.widgetSub}>{session?.title ?? 'Séance du jour'}</p>
        </div>
      </div>

      <div className={styles.recommendation}>
        <span className={styles.recoDot} style={{ background: recommendation.color }} />
        <span className={styles.recoText}>{recommendation.label}</span>
      </div>

      <div className={styles.powerZones}>
        {zones.map(z => (
          <div
            key={z.name}
            className={`${styles.zone} ${z.recommended ? styles.zoneRecommended : ''}`}
          >
            <div className={styles.zoneBar} style={{ background: z.color, opacity: z.recommended ? 1 : 0.3 }} />
            <div className={styles.zoneInfo}>
              <span className={styles.zoneName}>Z{z.num} — {z.name}</span>
              <span className={styles.zoneRange}>{z.min}–{z.max}W</span>
            </div>
            {z.recommended && <span className={styles.zoneTag}>Cible</span>}
          </div>
        ))}
      </div>

      <div className={styles.metaRow}>
        <Chip icon="⏱" label="Durée" value={session?.durationMin ? `${session.durationMin} min` : '—'} />
        <Chip icon="🎯" label="TSS cible" value={session?.durationMin ? `~${Math.round((session.durationMin / 60) * 65)}` : '—'} />
        <Chip icon="🔄" label="Cadence" value="88–92 rpm" />
      </div>
    </div>
  )
}

function computePowerZones(ftp: number) {
  return [
    { num: 1, name: 'Récup', min: 0, max: Math.round(ftp * 0.55), color: '#6c63ff', recommended: false },
    { num: 2, name: 'Endurance', min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: '#55cccc', recommended: false },
    { num: 3, name: 'Tempo', min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.9), color: '#c8f064', recommended: false },
    { num: 4, name: 'Seuil', min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: '#ffaa33', recommended: false },
    { num: 5, name: 'VO2max', min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.2), color: '#ff7c5c', recommended: false },
    { num: 6, name: 'Anaérobie', min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.5), color: '#ff5555', recommended: false },
  ]
}

// ─── Course à pied ────────────────────────────────────────────────────────────

function RunningWidget({ profile, hrv, bodyBattery, session }: {
  profile: Profile | null; hrv?: number | null; bodyBattery?: number | null; session?: Session
}) {
  const rec = getIntensityFromRecovery(hrv, bodyBattery)
  const maxHr = profile?.resting_hr ? 208 - (0.7 * 30) : 185
  const zones = computeHrZones(maxHr)

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.sportIcon}>🏃</span>
        <div>
          <h3 className={styles.widgetTitle}>Zones FC — Course</h3>
          <p className={styles.widgetSub}>{session?.title ?? 'Séance du jour'}</p>
        </div>
      </div>

      <div className={styles.recommendation}>
        <span className={styles.recoDot} style={{ background: rec.color }} />
        <span className={styles.recoText}>{rec.label}</span>
      </div>

      <div className={styles.hrZones}>
        {zones.map(z => (
          <div key={z.name} className={styles.hrZoneRow}>
            <span className={styles.hrZoneName}>Z{z.num}</span>
            <div className={styles.hrZoneBar}>
              <div
                className={styles.hrZoneFill}
                style={{ width: `${z.pct}%`, background: z.color }}
              />
            </div>
            <span className={styles.hrZoneRange}>{z.min}–{z.max} bpm</span>
          </div>
        ))}
      </div>

      <div className={styles.metaRow}>
        <Chip icon="⏱" label="Durée" value={session?.durationMin ? `${session.durationMin} min` : '—'} />
        <Chip icon="🎯" label="FC cible" value={`< ${Math.round(maxHr * 0.75)} bpm`} />
        <Chip icon="👟" label="Allure" value="Z2 recommandé" />
      </div>
    </div>
  )
}

function computeHrZones(maxHr: number) {
  const defs = [
    { num: 1, name: 'Récup', pct: 50, min: Math.round(maxHr * 0.5), max: Math.round(maxHr * 0.6), color: '#6c63ff' },
    { num: 2, name: 'Endurance', pct: 70, min: Math.round(maxHr * 0.6), max: Math.round(maxHr * 0.7), color: '#55cccc' },
    { num: 3, name: 'Aérobie', pct: 80, min: Math.round(maxHr * 0.7), max: Math.round(maxHr * 0.8), color: '#c8f064' },
    { num: 4, name: 'Seuil', pct: 90, min: Math.round(maxHr * 0.8), max: Math.round(maxHr * 0.9), color: '#ffaa33' },
    { num: 5, name: 'Max', pct: 100, min: Math.round(maxHr * 0.9), max: maxHr, color: '#ff5555' },
  ]
  return defs
}

// ─── Trail ────────────────────────────────────────────────────────────────────

function TrailWidget({ session }: { profile: Profile | null; hrv?: number | null; bodyBattery?: number | null; session?: Session }) {
  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.sportIcon}>🏔️</span>
        <div>
          <h3 className={styles.widgetTitle}>Trail du jour</h3>
          <p className={styles.widgetSub}>{session?.title ?? 'Séance du jour'}</p>
        </div>
      </div>
      <div className={styles.metaRow}>
        <Chip icon="⏱" label="Durée" value={session?.durationMin ? `${session.durationMin} min` : '—'} />
        <Chip icon="⛰️" label="D+" value="À définir" />
        <Chip icon="📏" label="Distance" value="À définir" />
      </div>
      <p className={styles.trailNote}>
        En trail, adapte l'allure au dénivelé : passe en marche active dans les montées raides (pente {'>'} 20%).
      </p>
    </div>
  )
}

// ─── Natation ─────────────────────────────────────────────────────────────────

function SwimmingWidget({ session }: { session?: Session }) {
  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.sportIcon}>🏊</span>
        <div>
          <h3 className={styles.widgetTitle}>Natation</h3>
          <p className={styles.widgetSub}>{session?.title ?? 'Séance du jour'}</p>
        </div>
      </div>
      <div className={styles.swimZones}>
        {[
          { zone: 'Z1', label: 'Récup', pace: '> 2\'10"/100m', color: '#6c63ff' },
          { zone: 'Z2', label: 'Endurance', pace: '1\'55"–2\'10"', color: '#55cccc' },
          { zone: 'Z3', label: 'Tempo', pace: '1\'45"–1\'55"', color: '#c8f064' },
          { zone: 'Z4', label: 'Seuil', pace: '1\'35"–1\'45"', color: '#ffaa33' },
        ].map(z => (
          <div key={z.zone} className={styles.swimZone}>
            <span className={styles.swimZoneDot} style={{ background: z.color }} />
            <span className={styles.swimZoneLabel}>{z.zone} {z.label}</span>
            <span className={styles.swimZonePace}>{z.pace}</span>
          </div>
        ))}
      </div>
      <div className={styles.metaRow}>
        <Chip icon="⏱" label="Durée" value={session?.durationMin ? `${session.durationMin} min` : '—'} />
        <Chip icon="📏" label="Volume" value="—" />
        <Chip icon="🔄" label="Style" value="Crawl" />
      </div>
    </div>
  )
}

// ─── Musculation ──────────────────────────────────────────────────────────────

function StrengthWidget({ session }: { session?: Session }) {
  const muscleGroups = getMuscleGroupsFromTitle(session?.title ?? '')

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.sportIcon}>💪</span>
        <div>
          <h3 className={styles.widgetTitle}>Musculation</h3>
          <p className={styles.widgetSub}>{session?.title ?? 'Séance du jour'}</p>
        </div>
      </div>

      {muscleGroups.length > 0 && (
        <div className={styles.muscleGroupRow}>
          <span className={styles.muscleGroupLabel}>Groupes ciblés :</span>
          {muscleGroups.map(g => (
            <span key={g.name} className={styles.muscleGroupTag} style={{ borderColor: g.color }}>
              {g.name}
            </span>
          ))}
        </div>
      )}

      <div className={styles.metaRow}>
        <Chip icon="⏱" label="Durée" value={session?.durationMin ? `${session.durationMin} min` : '—'} />
        <Chip icon="🔥" label="Échauffement" value="10 min" />
        <Chip icon="📈" label="Progression" value="+2.5 kg/sem" />
      </div>
    </div>
  )
}

function getMuscleGroupsFromTitle(title: string) {
  const map: { keywords: string[]; name: string; color: string }[] = [
    { keywords: ['jambe', 'squat', 'leg'], name: 'Jambes', color: '#c8f064' },
    { keywords: ['dos', 'back', 'pull', 'rowing'], name: 'Dos', color: '#ff7c5c' },
    { keywords: ['poitrine', 'chest', 'pec', 'bench'], name: 'Pectoraux', color: '#6c63ff' },
    { keywords: ['épaule', 'shoulder', 'ohp', 'militaire'], name: 'Épaules', color: '#55cccc' },
    { keywords: ['bras', 'bicep', 'tricep', 'curl'], name: 'Bras', color: '#ffaa33' },
    { keywords: ['fessier', 'glute', 'hip', 'rdl'], name: 'Fessiers', color: '#c8f064' },
    { keywords: ['full', 'total', 'complet'], name: 'Full body', color: '#a0a0a0' },
  ]
  const lower = title.toLowerCase()
  return map.filter(g => g.keywords.some(k => lower.includes(k)))
}

// ─── CrossFit ─────────────────────────────────────────────────────────────────

function CrossFitWidget({ session }: { session?: Session }) {
  const wodType = detectWodType(session?.title ?? '')

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.sportIcon}>🔥</span>
        <div>
          <h3 className={styles.widgetTitle}>CrossFit — {wodType.type}</h3>
          <p className={styles.widgetSub}>{session?.title ?? 'Séance du jour'}</p>
        </div>
      </div>

      <div className={styles.wodInfo}>
        <span className={styles.wodBadge} style={{ background: wodType.color }}>{wodType.type}</span>
        <p className={styles.wodDesc}>{wodType.desc}</p>
      </div>

      <div className={styles.metaRow}>
        <Chip icon="⏱" label="Durée" value={session?.durationMin ? `${session.durationMin} min` : '—'} />
        <Chip icon="🎯" label="Objectif" value="Régularité" />
        <Chip icon="💨" label="Rythme" value="Constant" />
      </div>
    </div>
  )
}

function detectWodType(title: string) {
  const lower = title.toLowerCase()
  if (lower.includes('amrap')) return { type: 'AMRAP', color: '#ff5555', desc: 'As Many Rounds As Possible — Rythme régulier, pas d\'explosion en début' }
  if (lower.includes('emom')) return { type: 'EMOM', color: '#ffaa33', desc: 'Every Minute On the Minute — Récupère le temps restant de chaque minute' }
  if (lower.includes('for time')) return { type: 'For Time', color: '#c8f064', desc: 'Complète le travail le plus vite possible — Pacing intelligent dès le début' }
  if (lower.includes('tabata')) return { type: 'Tabata', color: '#6c63ff', desc: '20s effort / 10s repos × 8 rounds — Effort maximal sur chaque bloc' }
  return { type: 'WOD', color: '#55cccc', desc: 'Workout Of the Day — Reste régulier et gère bien ton effort' }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function getIntensityFromRecovery(hrv?: number | null, bodyBattery?: number | null) {
  const score = ((hrv ?? 50) / 100 + (bodyBattery ?? 60) / 100) / 2 * 100
  if (score >= 60) return { label: 'Bonne récup — tu peux charger', color: 'var(--success)' }
  if (score >= 35) return { label: 'Récup moyenne — reste en endurance', color: 'var(--warning)' }
  return { label: 'Récup faible — séance légère recommandée', color: 'var(--danger)' }
}

function Chip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.chip}>
      <span className={styles.chipIcon}>{icon}</span>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue}>{value}</span>
    </div>
  )
}
