export type ActivitySource = 'garmin' | 'wahoo' | 'apple_health' | 'manual'

const SOURCE_PRIORITY: Record<ActivitySource, number> = {
  garmin: 1,
  wahoo: 2,
  apple_health: 3,
  manual: 4,
}

export interface NormalizedActivity {
  externalId: string
  source: ActivitySource
  sport: string
  date: string        // YYYY-MM-DD
  startTime: string   // ISO
  durationMin: number
  hrAvg?: number | null
  powerAvgWatts?: number | null
  distanceM?: number | null
  elevationM?: number | null
  calories?: number | null
  raw?: unknown
}

export class ActivityDeduplicator {
  /**
   * Fingerprint d'une activité : sport + date + durée arrondie à 5 min
   * Deux activités avec le même fingerprint sont considérées dupliquées.
   */
  static fingerprint(activity: Pick<NormalizedActivity, 'sport' | 'date' | 'durationMin'>): string {
    const sport = normalizeSport(activity.sport)
    const bucket = Math.round(activity.durationMin / 5) * 5
    return `${sport}|${activity.date}|${bucket}`
  }

  /**
   * Déduplique une liste d'activités multi-sources.
   * Garde la source la plus prioritaire par fingerprint.
   * Retourne les activités à conserver + les doublons rejetés.
   */
  static deduplicate(activities: NormalizedActivity[]): {
    kept: NormalizedActivity[]
    duplicates: Array<{ kept: NormalizedActivity; rejected: NormalizedActivity }>
  } {
    const byFingerprint = new Map<string, NormalizedActivity>()
    const duplicates: Array<{ kept: NormalizedActivity; rejected: NormalizedActivity }> = []

    const sorted = [...activities].sort(
      (a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]
    )

    for (const activity of sorted) {
      const fp = this.fingerprint(activity)
      const existing = byFingerprint.get(fp)

      if (!existing) {
        byFingerprint.set(fp, activity)
      } else {
        const keepExisting = SOURCE_PRIORITY[existing.source] <= SOURCE_PRIORITY[activity.source]
        if (keepExisting) {
          duplicates.push({ kept: existing, rejected: activity })
        } else {
          duplicates.push({ kept: activity, rejected: existing })
          byFingerprint.set(fp, activity)
        }
      }
    }

    return { kept: Array.from(byFingerprint.values()), duplicates }
  }

  /**
   * Vérifie si une nouvelle activité est dupliquée avec une liste existante.
   */
  static isDuplicate(
    newActivity: NormalizedActivity,
    existingActivities: NormalizedActivity[]
  ): { isDup: boolean; duplicate?: NormalizedActivity } {
    const fp = this.fingerprint(newActivity)
    const match = existingActivities.find(a => this.fingerprint(a) === fp)
    if (!match) return { isDup: false }
    const shouldReject = SOURCE_PRIORITY[match.source] <= SOURCE_PRIORITY[newActivity.source]
    return { isDup: shouldReject, duplicate: match }
  }
}

function normalizeSport(sport: string): string {
  const lower = sport.toLowerCase()
  if (lower.includes('cycl') || lower.includes('bike') || lower.includes('velo')) return 'cycling'
  if (lower.includes('run') || lower.includes('course') || lower.includes('jogging')) return 'running'
  if (lower.includes('swim') || lower.includes('natation')) return 'swimming'
  if (lower.includes('trail') || lower.includes('hike')) return 'trail'
  if (lower.includes('strength') || lower.includes('muscu') || lower.includes('weight')) return 'strength'
  if (lower.includes('crossfit') || lower.includes('hiit')) return 'crossfit'
  if (lower.includes('yoga') || lower.includes('stretching')) return 'yoga'
  return lower.replace(/\s+/g, '_')
}
