import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { apiGet, apiPost } from '@/lib/api'
import { GarminConnectButton } from '@/components/garmin/GarminConnectButton'
import { SportWidget } from '@/components/dashboard/SportWidget'
import { loadDashboardConfig, saveDashboardConfig, WIDGET_DEFS, WidgetConfig } from '@/lib/dashboardConfig'
import { SPORT_COLORS, sportEmoji } from '@/lib/sports'
import styles from './DashboardPage.module.css'

const SECTION_TITLE: Record<string, string> = {
  recovery: 'Récupération',
  sleep_phases: 'Phases de sommeil',
  load: "Charge d'entraînement",
  ai_coach: '',
  sport_widget: 'Préparation du jour',
  sessions_today: "Au programme aujourd'hui",
  proactive_alerts: '',
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

interface ProactiveAlert {
  id: string; type: string; content: string; date: string
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
  const [widgetCfg, setWidgetCfg] = useState<WidgetConfig[]>(() => loadDashboardConfig())
  const [editMode, setEditMode] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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
    ? status.acuteLoad / status.chronicLoad : null

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

  function updateWgt(id: string, patch: Partial<WidgetConfig>) {
    setWidgetCfg(prev => {
      const next = prev.map(w => w.id === id ? { ...w, ...patch } : w)
      saveDashboardConfig(next)
      return next
    })
  }

  function swapWidgets(id1: string, id2: string) {
    setWidgetCfg(prev => {
      const w1 = prev.find(w => w.id === id1)!
      const w2 = prev.find(w => w.id === id2)!
      const next = prev.map(w => {
        if (w.id === id1) return { ...w, order: w2.order }
        if (w.id === id2) return { ...w, order: w1.order }
        return w
      })
      saveDashboardConfig(next)
      return next
    })
  }

  function shiftWgt(id: string, dir: -1 | 1) {
    setWidgetCfg(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(w => w.id === id)
      const ni = idx + dir
      if (ni < 0 || ni >= sorted.length) return prev
      const o0 = sorted[idx].order
      const o1 = sorted[ni].order
      const next = prev.map(w => {
        if (w.id === sorted[idx].id) return { ...w, order: o1 }
        if (w.id === sorted[ni].id) return { ...w, order: o0 }
        return w
      })
      saveDashboardConfig(next)
      return next
    })
  }

  const sortedWidgets = useMemo(
    () => [...widgetCfg].sort((a, b) => a.order - b.order),
    [widgetCfg]
  )

  function getWidgetContent(id: string, vizType: string): React.ReactNode | null {
    switch (id) {
      case 'recovery': {
        if (!status?.hrv && !status?.bodyBattery && !status?.sleepScore && !status?.restingHr) return null
        if (vizType === 'gauges') {
          return (
            <div className={styles.gaugesGrid}>
              <ArcGauge value={status?.hrv} max={100} color={scoreColor(status?.hrv, 50, 30)} label="HRV" unit="ms" />
              <ArcGauge value={status?.bodyBattery} max={100} color={scoreColor(status?.bodyBattery, 60, 30)} label="Battery" unit="/100" />
              <ArcGauge value={status?.sleepScore} max={100} color={scoreColor(status?.sleepScore, 70, 50)} label="Sommeil" unit="/100" />
              <ArcGauge value={status?.restingHr} max={100} color="var(--text-secondary)" label="FC repos" unit="bpm" />
            </div>
          )
        }
        if (vizType === 'compact') {
          return (
            <div className={styles.metricsRow}>
              <MetricInline label="HRV" value={status?.hrv} unit="ms" color={scoreColor(status?.hrv, 50, 30)} />
              <MetricInline label="Battery" value={status?.bodyBattery} unit="/100" color={scoreColor(status?.bodyBattery, 60, 30)} />
              <MetricInline label="Sommeil" value={status?.sleepScore} unit="/100" color={scoreColor(status?.sleepScore, 70, 50)} />
              <MetricInline label="FC" value={status?.restingHr} unit="bpm" />
            </div>
          )
        }
        return (
          <div className={styles.metricsGrid}>
            <MetricCard label="HRV" value={status?.hrv} unit="ms" color={scoreColor(status?.hrv, 50, 30)} icon="❤️" />
            <MetricCard label="Body Battery" value={status?.bodyBattery} unit="/100" color={scoreColor(status?.bodyBattery, 60, 30)} icon="⚡" />
            <MetricCard label="Sommeil" value={status?.sleepScore} unit="/100" color={scoreColor(status?.sleepScore, 70, 50)} icon="🌙"
              sub={status?.sleepDurationMin ? `${Math.floor(status.sleepDurationMin / 60)}h${String(status.sleepDurationMin % 60).padStart(2, '0')}` : undefined} />
            <MetricCard label="FC repos" value={status?.restingHr} unit="bpm" icon="💓" />
          </div>
        )
      }

      case 'sleep_phases': {
        if (!status?.sleepDeepMin && !status?.sleepRemMin) return null
        if (vizType === 'score') {
          const h = Math.floor((status?.sleepDurationMin ?? 0) / 60)
          const m = (status?.sleepDurationMin ?? 0) % 60
          return (
            <div className={styles.sleepScoreCard}>
              <span className={styles.sleepScoreNum} style={{ color: scoreColor(status?.sleepScore, 70, 50) }}>
                {status?.sleepScore ?? '—'}
                <span className={styles.sleepScoreOf}>/100</span>
              </span>
              <div className={styles.sleepScoreDetails}>
                <span>{h}h{String(m).padStart(2, '0')} de sommeil</span>
                {status?.sleepDeepMin && <span>{Math.round(status.sleepDeepMin / 60)}h profond</span>}
              </div>
            </div>
          )
        }
        return (
          <div className={styles.sleepBars}>
            <SleepBar label="Profond" minutes={status?.sleepDeepMin ?? 0} color="#6c63ff" />
            <SleepBar label="REM" minutes={status?.sleepRemMin ?? 0} color="var(--accent)" />
            <SleepBar label="Léger" minutes={(status?.sleepDurationMin ?? 0) - (status?.sleepDeepMin ?? 0) - (status?.sleepRemMin ?? 0)} color="#555" />
          </div>
        )
      }

      case 'load': {
        if (loadRatio === null) return null
        if (vizType === 'compact') {
          return (
            <div className={styles.loadCompact}>
              <div className={styles.loadCompactTop}>
                <span className={styles.loadCompactRatio} style={{ color: ratioColor(loadRatio) }}>
                  {loadRatio.toFixed(2)}
                  {loadRatio > 1.5 && ' ⚠️'}
                </span>
                <span className={styles.loadCompactLabel}>ratio aiguë/chronique</span>
              </div>
              <LoadRatioBar ratio={loadRatio} />
            </div>
          )
        }
        return (
          <>
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
          </>
        )
      }

      case 'ai_coach': {
        if (!status?.aiRecommendation) return null
        const rec = status.aiRecommendation
        const isCompact = vizType === 'compact'
        return (
          <div className={styles.aiCard}>
            <div className={styles.aiHeader}>
              <span>🤖</span>
              <span>Coach IA — Analyse du jour</span>
            </div>
            <p>{isCompact && rec.length > 110 ? rec.slice(0, 110) + '…' : rec}</p>
            <Link to="/chat" className={styles.aiCta}>
              {isCompact ? 'Lire la suite →' : 'Parler à mon coach →'}
            </Link>
          </div>
        )
      }

      case 'sport_widget': {
        if (!sessions.length) return null
        return (
          <SportWidget
            profile={profile}
            todaySessions={sessions}
            hrv={status?.hrv}
            bodyBattery={status?.bodyBattery}
            minimal={vizType === 'minimal'}
          />
        )
      }

      case 'sessions_today': {
        if (!sessions.length && hasPlan) return null
        if (!sessions.length) {
          return (
            <button className={styles.generatePlanBtn} onClick={generatePlan} disabled={generatingPlan}>
              {generatingPlan ? '🤖 Génération du plan…' : '✨ Générer mon plan de la semaine'}
            </button>
          )
        }
        if (vizType === 'list') {
          return (
            <div className={styles.sessionsListCompact}>
              {sessions.map(s => (
                <Link key={s.id} to={`/session/${s.id}`} className={styles.sessionListRow}>
                  <span className={styles.sessionListDot} style={{ background: SPORT_COLORS[s.sport] ?? '#888' }} />
                  <span className={styles.sessionListTitle}>{s.title}</span>
                  <span className={styles.sessionListMeta}>{s.durationMin}min →</span>
                </Link>
              ))}
            </div>
          )
        }
        return (
          <div className={styles.sessionsList}>
            {sessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        )
      }

      case 'proactive_alerts': {
        if (!proactiveAlerts.length) return null
        if (vizType === 'compact') {
          return (
            <div className={styles.alertsCompact}>
              {proactiveAlerts.map(a => (
                <div key={a.id} className={styles.alertCompactItem}>
                  <span className={styles.alertCompactDot} />
                  <p className={styles.alertCompactText}>{a.content.slice(0, 90)}…</p>
                </div>
              ))}
            </div>
          )
        }
        return (
          <>
            {proactiveAlerts.map(a => (
              <div key={a.id} className={styles.proactiveCard}>
                <span className={styles.proactiveIcon}>💡</span>
                <p>{a.content}</p>
              </div>
            ))}
          </>
        )
      }

      default: return null
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
        <div className={styles.headerActions}>
          {!garminConnected && <GarminConnectButton onConnected={() => setGarminConnected(true)} />}
          <button
            className={`${styles.editBtn} ${editMode ? styles.editBtnActive : ''}`}
            onClick={() => setEditMode(e => !e)}
          >
            {editMode ? (
              <><CheckIcon /> Terminé</>
            ) : (
              <><SlidersIcon /> Widgets</>
            )}
          </button>
        </div>
      </header>

      {editMode && (
        <div className={styles.editHint}>
          Masque, réordonne et change la visualisation de chaque widget.
        </div>
      )}

      {sortedWidgets.map((wc, i) => {
        const def = WIDGET_DEFS[wc.id]
        const content = getWidgetContent(wc.id, wc.vizType)
        if (!editMode && !wc.visible) return null
        if (!editMode && !content) return null

        const title = SECTION_TITLE[wc.id]
        const isFirst = i === 0
        const isLast = i === sortedWidgets.length - 1

        const isDragOver = editMode && dragOverId === wc.id && dragId !== wc.id
        return (
          <div
            key={wc.id}
            draggable={editMode}
            className={`${editMode ? styles.editWidget : ''} ${isDragOver ? styles.editWidgetDragOver : ''}`}
            style={{ opacity: editMode && !wc.visible ? 0.45 : dragId === wc.id ? 0.4 : 1 }}
            onDragStart={e => { if (editMode) { e.dataTransfer.effectAllowed = 'move'; setDragId(wc.id) } }}
            onDragEnd={() => { setDragId(null); setDragOverId(null) }}
            onDragOver={e => { if (editMode && dragId && dragId !== wc.id) { e.preventDefault(); setDragOverId(wc.id) } }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => { e.preventDefault(); if (dragId && dragId !== wc.id) { swapWidgets(dragId, wc.id); setDragId(null); setDragOverId(null) } }}
          >
            {editMode && (
              <div className={styles.editBar}>
                <button
                  className={`${styles.visBtn} ${wc.visible ? styles.visBtnOn : styles.visBtnOff}`}
                  onClick={() => updateWgt(wc.id, { visible: !wc.visible })}
                  title={wc.visible ? 'Masquer' : 'Afficher'}
                >
                  {wc.visible ? <EyeOnIcon /> : <EyeOffIcon />}
                </button>
                <span className={styles.editLabel}>{def.label}</span>
                <div className={styles.vizPills}>
                  {def.vizTypes.map(vt => (
                    <button
                      key={vt.id}
                      className={`${styles.vizPill} ${wc.vizType === vt.id ? styles.vizPillActive : ''}`}
                      onClick={() => updateWgt(wc.id, { vizType: vt.id })}
                    >
                      {vt.label}
                    </button>
                  ))}
                </div>
                <div className={styles.orderBtns}>
                  <button className={styles.orderBtn} disabled={isFirst} onClick={() => shiftWgt(wc.id, -1)}>↑</button>
                  <button className={styles.orderBtn} disabled={isLast} onClick={() => shiftWgt(wc.id, 1)}>↓</button>
                </div>
              </div>
            )}
            {content && (
              wc.id === 'ai_coach' || wc.id === 'proactive_alerts'
                ? <section className={styles.section}>{content}</section>
                : <section className={styles.section}>
                    {title && <h2 className={styles.sectionTitle}>{title}</h2>}
                    {content}
                  </section>
            )}
          </div>
        )
      })}

      {!garminConnected && !status?.hrv && !editMode && (
        <div className={styles.noData}>
          <p>Connecte ton Garmin pour voir tes données de récupération automatiquement chaque matin.</p>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, color, icon, sub }: {
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

function MetricInline({ label, value, unit, color }: {
  label: string; value: number | null | undefined; unit: string; color?: string
}) {
  return (
    <div className={styles.metricInline}>
      <span className={styles.metricInlineValue} style={{ color: color ?? 'var(--text-primary)' }}>
        {value ?? '—'}<span className={styles.metricInlineUnit}>{unit}</span>
      </span>
      <span className={styles.metricInlineLabel}>{label}</span>
    </div>
  )
}

function ArcGauge({ value, max = 100, color, label, unit }: {
  value: number | null | undefined; max?: number; color?: string; label: string; unit: string
}) {
  const pct = value != null ? Math.min(value / max, 1) : 0
  const r = 26, cx = 32, cy = 32
  const circ = 2 * Math.PI * r
  return (
    <div className={styles.gauge}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color ?? 'var(--text-secondary)'} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill="var(--text-primary)" fontSize="12" fontWeight="700">
          {value ?? '—'}
        </text>
      </svg>
      <span className={styles.gaugeLabel}>{label}</span>
      <span className={styles.gaugeUnit}>{unit}</span>
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

// ─── Edit mode icons ──────────────────────────────────────────────────────────

function EyeOnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 7.5C1 7.5 3.2 3 7.5 3C11.8 3 14 7.5 14 7.5C14 7.5 11.8 12 7.5 12C3.2 12 1 7.5 1 7.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 2L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M6 3.5C6.4 3.2 7 3 7.5 3C11.8 3 14 7.5 14 7.5C14 7.5 13 9 11.5 10.5M4 5C2.5 6 1 7.5 1 7.5C1 7.5 3.2 12 7.5 12C8.5 12 9.5 11.7 10 11.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 4H12M2 7H6M2 10H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9 2.5V5.5M4 8.5V11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

