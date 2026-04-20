export const SPORTS = [
  'Triathlon', 'Cyclisme', 'Course à pied', 'Trail',
  'Natation', 'Musculation', 'CrossFit', 'Sport collectif', 'Autre',
] as const

export const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'competitor', label: 'Compétiteur' },
] as const

export const GOALS = [
  'Perte de poids',
  'Amélioration des performances',
  'Préparation compétition',
  'Santé générale',
  'Prise de masse',
] as const

export const DEVICES = [
  'Garmin', 'Wahoo', 'Apple Health', 'Polar',
  'Suunto', 'Whoop', 'Oura Ring', 'Saisie manuelle',
] as const

export const LOAD_RATIO_THRESHOLDS = {
  WARNING: 1.3,
  DANGER: 1.5,
} as const

export const HRV_THRESHOLDS = {
  GOOD: 50,
  WARNING: 30,
} as const

export const BODY_BATTERY_THRESHOLDS = {
  GOOD: 60,
  WARNING: 30,
} as const
