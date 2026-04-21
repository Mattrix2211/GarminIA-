export interface WidgetConfig {
  id: string
  visible: boolean
  vizType: string
  order: number
}

export const WIDGET_DEFS: Record<string, { label: string; vizTypes: { id: string; label: string }[] }> = {
  recovery: {
    label: 'Récupération',
    vizTypes: [
      { id: 'grid', label: 'Grille' },
      { id: 'gauges', label: 'Jauges' },
      { id: 'compact', label: 'Compact' },
    ],
  },
  sleep_phases: {
    label: 'Sommeil',
    vizTypes: [
      { id: 'bars', label: 'Barres' },
      { id: 'score', label: 'Score' },
    ],
  },
  load: {
    label: 'Charge',
    vizTypes: [
      { id: 'detailed', label: 'Détaillé' },
      { id: 'compact', label: 'Compact' },
    ],
  },
  ai_coach: {
    label: 'Coach IA',
    vizTypes: [
      { id: 'full', label: 'Complet' },
      { id: 'compact', label: 'Compact' },
    ],
  },
  sport_widget: {
    label: 'Sport du jour',
    vizTypes: [
      { id: 'full', label: 'Complet' },
      { id: 'minimal', label: 'Minimal' },
    ],
  },
  sessions_today: {
    label: 'Séances du jour',
    vizTypes: [
      { id: 'cards', label: 'Cartes' },
      { id: 'list', label: 'Liste' },
    ],
  },
  proactive_alerts: {
    label: 'Alertes coach',
    vizTypes: [
      { id: 'full', label: 'Complètes' },
      { id: 'compact', label: 'Compactes' },
    ],
  },
}

const WIDGET_ORDER = ['recovery', 'sleep_phases', 'load', 'ai_coach', 'sport_widget', 'sessions_today', 'proactive_alerts']
const STORAGE_KEY = 'dash_cfg_v1'

const defaultConfig = (): WidgetConfig[] =>
  WIDGET_ORDER.map((id, order) => ({
    id,
    visible: true,
    vizType: WIDGET_DEFS[id].vizTypes[0].id,
    order,
  }))

export function loadDashboardConfig(): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: WidgetConfig[] = JSON.parse(raw)
      // Merge in case new widgets were added
      const defaults = defaultConfig()
      const merged = defaults.map(def => {
        const saved = parsed.find(p => p.id === def.id)
        return saved ?? def
      })
      return merged
    }
  } catch {}
  return defaultConfig()
}

export function saveDashboardConfig(config: WidgetConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
