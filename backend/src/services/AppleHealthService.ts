import { supabaseAdmin } from '../db/supabase'
import { ActivityDeduplicator, type NormalizedActivity } from './ActivityDeduplicator'

/**
 * Apple HealthKit ne fournit pas d'API web directe.
 * Deux méthodes d'intégration :
 *  1. Export JSON via Apple Shortcuts (iOS Shortcut → POST /api/apple/sync)
 *  2. Import manuel du fichier export Apple Health (XML parsé côté client)
 *
 * Ce service traite les données reçues, déduplique avec Garmin/Wahoo,
 * et stocke les activités nettes dans synced_activities.
 */
export class AppleHealthService {
  static async importWorkouts(
    userId: string,
    workouts: AppleWorkoutPayload[]
  ): Promise<{ imported: number; duplicates: number }> {
    const normalized: NormalizedActivity[] = workouts.map(normalizeAppleWorkout)

    const { data: existingRaw } = await supabaseAdmin
      .from('synced_activities')
      .select('external_id, source, sport, date, duration_min')
      .eq('user_id', userId)

    const existing: NormalizedActivity[] = (existingRaw ?? []).map(r => ({
      externalId: r.external_id,
      source: r.source as any,
      sport: r.sport,
      date: r.date,
      startTime: r.date,
      durationMin: r.duration_min,
    }))

    const withExisting = [...existing, ...normalized]
    const { kept, duplicates } = ActivityDeduplicator.deduplicate(withExisting)

    const newToInsert = kept.filter(a =>
      a.source === 'apple_health' &&
      !existing.some(e => e.externalId === a.externalId && e.source === 'apple_health')
    )

    if (newToInsert.length > 0) {
      await supabaseAdmin.from('synced_activities').insert(
        newToInsert.map(w => ({
          user_id: userId,
          source: 'apple_health',
          external_id: w.externalId,
          sport: w.sport,
          date: w.date,
          start_time: w.startTime,
          duration_min: w.durationMin,
          hr_avg: w.hrAvg,
          distance_m: w.distanceM,
          calories: w.calories,
          dedup_fingerprint: ActivityDeduplicator.fingerprint(w),
        }))
      )
    }

    return { imported: newToInsert.length, duplicates: duplicates.length }
  }

  static async getStatus(userId: string): Promise<{ connected: boolean; lastSync: string | null }> {
    const { data } = await supabaseAdmin
      .from('synced_activities')
      .select('created_at')
      .eq('user_id', userId)
      .eq('source', 'apple_health')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return { connected: !!data, lastSync: data?.created_at ?? null }
  }
}

export interface AppleWorkoutPayload {
  uuid: string
  workoutActivityType: string  // e.g. "HKWorkoutActivityTypeCycling"
  startDate: string            // ISO
  endDate: string              // ISO
  duration: number             // seconds
  totalEnergyBurned?: number   // kcal
  totalDistance?: number       // meters
  heartRateAvg?: number
}

function normalizeAppleWorkout(w: AppleWorkoutPayload): NormalizedActivity {
  const start = new Date(w.startDate)
  const durationMin = Math.round(w.duration / 60)
  return {
    externalId: w.uuid,
    source: 'apple_health',
    sport: appleActivityTypeMap(w.workoutActivityType),
    date: start.toISOString().split('T')[0],
    startTime: start.toISOString(),
    durationMin,
    hrAvg: w.heartRateAvg ?? null,
    distanceM: w.totalDistance ?? null,
    calories: w.totalEnergyBurned ?? null,
  }
}

function appleActivityTypeMap(type: string): string {
  const map: Record<string, string> = {
    HKWorkoutActivityTypeCycling: 'Cyclisme',
    HKWorkoutActivityTypeRunning: 'Course à pied',
    HKWorkoutActivityTypeSwimming: 'Natation',
    HKWorkoutActivityTypeTraditionalStrengthTraining: 'Musculation',
    HKWorkoutActivityTypeFunctionalStrengthTraining: 'Musculation',
    HKWorkoutActivityTypeHighIntensityIntervalTraining: 'CrossFit',
    HKWorkoutActivityTypeHiking: 'Trail',
    HKWorkoutActivityTypeTriathlon: 'Triathlon',
    HKWorkoutActivityTypeYoga: 'Yoga',
    HKWorkoutActivityTypeWalking: 'Marche',
  }
  return map[type] ?? type.replace('HKWorkoutActivityType', '')
}
