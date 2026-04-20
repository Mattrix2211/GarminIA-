export type Sport =
  | 'Triathlon'
  | 'Cyclisme'
  | 'Course à pied'
  | 'Trail'
  | 'Natation'
  | 'Musculation'
  | 'CrossFit'
  | 'Sport collectif'
  | 'Autre'

export type Level = 'beginner' | 'intermediate' | 'advanced' | 'competitor'

export type Goal =
  | 'Perte de poids'
  | 'Amélioration des performances'
  | 'Préparation compétition'
  | 'Santé générale'
  | 'Prise de masse'

export type Device = 'Garmin' | 'Wahoo' | 'Apple Health' | 'Polar' | 'Suunto' | 'Whoop' | 'Oura Ring' | 'Saisie manuelle'

export interface UserProfile {
  id: string
  userId: string
  firstName: string
  age: number | null
  weightKg: number | null
  heightCm: number | null
  sports: Sport[]
  level: Level
  goals: Goal[]
  targetCompetitionDate: string | null
  availableDays: number[]
  maxSessionDurationMin: number
  equipment: string[]
  vo2max: number | null
  ftpWatts: number | null
  restingHr: number | null
  onboardingCompleted: boolean
}

export interface GarminDailyData {
  date: string
  hrv: number | null
  bodyBattery: number | null
  sleepScore: number | null
  sleepDurationMin: number | null
  restingHr: number | null
  stressAvg: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  recoveryTimeHours: number | null
  trainingStatus: string | null
}

export interface TrainingSession {
  id: string
  userId: string
  date: string
  sport: Sport
  title: string
  description: string | null
  durationMin: number | null
  status: 'planned' | 'completed' | 'skipped' | 'modified'
  perceivedEffort: number | null
  moodStars: number | null
  notes: string | null
  hrAvg: number | null
  powerAvgWatts: number | null
  pacePerKm: string | null
  tss: number | null
}

export interface SetRecord {
  exerciseName: string
  setNumber: number
  weightKg: number | null
  reps: number | null
  durationSec: number | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
