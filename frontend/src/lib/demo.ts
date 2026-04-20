export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export const demoProfile = {
  id: 'demo-profile',
  user_id: 'demo-user',
  first_name: 'Matthis',
  age: 28,
  weight_kg: 72.5,
  height_cm: 178,
  sports: ['Triathlon', 'Cyclisme', 'Course à pied'],
  level: 'competitor' as const,
  goals: ['Préparation compétition', 'Amélioration des performances'],
  target_competition_date: '2026-06-15',
  available_days: [1, 2, 3, 4, 6],
  max_session_duration_min: 120,
  equipment: ['Garmin', 'Home trainer', 'Piscine'],
  vo2max: 62.4,
  ftp_watts: 285,
  resting_hr: 48,
  onboarding_completed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const demoDaily = {
  hrv: 58,
  bodyBattery: 74,
  sleepScore: 81,
  sleepDurationMin: 447,
  sleepDeepMin: 82,
  sleepRemMin: 94,
  sleepLightMin: 240,
  restingHr: 48,
  stressAvg: 22,
  recoveryTimeHours: 14,
  acuteLoad: 387,
  chronicLoad: 312,
  aiRecommendation: "Ta HRV est bonne ce matin à 58ms et ton Body Battery est à 74. Tu peux aller chercher la séance vélo prévue. Reste en zone 2 strict les 30 premières minutes pour bien t'échauffer — ton ratio charge est à 1.24, on surveille.",
}

export const demoSessions = [
  {
    id: 'demo-session-1',
    title: 'Endurance fondamentale Z2',
    sport: 'Cyclisme',
    description: '2h en zone 2 (162–178W). Cadence 85–90rpm. Alimentation toutes les 45min.',
    durationMin: 120,
    status: 'planned',
  },
]

export const demoSessionDetail = {
  id: 'demo-session-1',
  title: 'Endurance fondamentale Z2',
  sport: 'Cyclisme',
  description: '2h en zone 2 (162–178W). Cadence 85–90rpm.',
  durationMin: 120,
  status: 'planned',
  isAmrap: false,
  exercises: [
    { name: 'Échauffement progressif', sets: 1, reps: '20 min', rest: 0, notes: 'Z1 → Z2, cadence 85rpm' },
    { name: 'Bloc Z2 — 162–178W', sets: 1, reps: '80 min', rest: 0, notes: 'Cadence 88rpm, FC < 155bpm' },
    { name: 'Retour au calme', sets: 1, reps: '20 min', rest: 0, notes: 'Z1, étirements mentaux' },
  ],
}

export const demoMuscuSession = {
  id: 'demo-session-muscu',
  title: 'Force — Jambes',
  sport: 'Musculation',
  description: 'Séance de force jambes',
  durationMin: 75,
  status: 'planned',
  isAmrap: false,
  exercises: [
    { name: 'Squat', sets: 4, reps: '6', rest: 180, notes: 'Descente en 3 temps, bien casser le parallèle', weight: 90 },
    { name: 'Presse à cuisses', sets: 3, reps: '10', rest: 120, notes: '110kg — pieds écartés à largeur épaules' },
    { name: 'Fentes bulgares', sets: 3, reps: '8', rest: 90, notes: 'Haltères 20kg chaque main' },
    { name: 'Leg curl couché', sets: 3, reps: '12', rest: 60, notes: 'Ischio-jambiers, controlled eccentric' },
    { name: 'Mollets debout', sets: 4, reps: '15', rest: 45 },
  ],
}

export const demoAmrapSession = {
  id: 'demo-session-amrap',
  title: 'AMRAP 20min — Hero WOD',
  sport: 'CrossFit',
  description: 'AMRAP en 20 minutes',
  durationMin: 20,
  status: 'planned',
  isAmrap: true,
  amrapDurationMin: 20,
  exercises: [
    { name: 'Burpees', sets: 1, reps: '5', rest: 0 },
    { name: 'Pull-ups', sets: 1, reps: '10', rest: 0 },
    { name: 'Air Squats', sets: 1, reps: '15', rest: 0 },
    { name: 'Kettlebell Swings', sets: 1, reps: '20 — 24kg', rest: 0 },
  ],
}

export const demoJournalSessions = [
  {
    id: 'j1', date: getDateOffset(-1), sport: 'Cyclisme', title: 'Endurance fondamentale Z2',
    durationMin: 118, perceivedEffort: 5, moodStars: 4, hrAvg: 147, powerAvgWatts: 171,
    pacePerKm: null, tss: 89, notes: 'Bonnes sensations, facile tout du long.', status: 'completed',
  },
  {
    id: 'j2', date: getDateOffset(-2), sport: 'Course à pied', title: 'Allure seuil 4×10min',
    durationMin: 65, perceivedEffort: 8, moodStars: 3, hrAvg: 168, powerAvgWatts: null,
    pacePerKm: "3'58\"", tss: 74, notes: 'Dur sur le 3e bloc, allure un peu tombée.', status: 'completed',
  },
  {
    id: 'j3', date: getDateOffset(-3), sport: 'Natation', title: 'Technique + Endurance',
    durationMin: 50, perceivedEffort: 6, moodStars: 4, hrAvg: null, powerAvgWatts: null,
    pacePerKm: null, tss: 42, notes: null, status: 'completed',
  },
  {
    id: 'j4', date: getDateOffset(-4), sport: 'Musculation', title: 'Force — Jambes',
    durationMin: 72, perceivedEffort: 7, moodStars: 5, hrAvg: null, powerAvgWatts: null,
    pacePerKm: null, tss: null, notes: 'PR squat à 100kg ✓', status: 'completed',
  },
  {
    id: 'j5', date: getDateOffset(-5), sport: 'Cyclisme', title: 'VO2max — 5×4min',
    durationMin: 90, perceivedEffort: 9, moodStars: 3, hrAvg: 178, powerAvgWatts: 318,
    pacePerKm: null, tss: 103, notes: 'Très difficile, chaleur ++. Dernier bloc abrégé.', status: 'completed',
  },
  {
    id: 'j6', date: getDateOffset(-6), sport: 'Course à pied', title: 'Récupération active',
    durationMin: 35, perceivedEffort: 3, moodStars: 5, hrAvg: 130, powerAvgWatts: null,
    pacePerKm: "5'30\"", tss: 18, notes: null, status: 'completed',
  },
  {
    id: 'j7', date: getDateOffset(-8), sport: 'Cyclisme', title: 'Sortie longue 3h',
    durationMin: 182, perceivedEffort: 6, moodStars: 5, hrAvg: 151, powerAvgWatts: 183,
    pacePerKm: null, tss: 142, notes: 'Magnifique sortie, paysage top.', status: 'completed',
  },
  {
    id: 'j8', date: getDateOffset(-9), sport: 'Natation', title: 'Blocs vitesse 10×50m',
    durationMin: 45, perceivedEffort: 7, moodStars: 4, hrAvg: null, powerAvgWatts: null,
    pacePerKm: null, tss: 38, notes: null, status: 'completed',
  },
]

export const demoWeights = [
  { weekStartDate: getDateOffset(-35), weightKg: 73.2 },
  { weekStartDate: getDateOffset(-28), weightKg: 73.0 },
  { weekStartDate: getDateOffset(-21), weightKg: 72.8 },
  { weekStartDate: getDateOffset(-14), weightKg: 72.5 },
  { weekStartDate: getDateOffset(-7), weightKg: 72.3 },
  { weekStartDate: getDateOffset(0), weightKg: 72.5 },
]

export const demoHrvHistory = Array.from({ length: 30 }, (_, i) => ({
  date: getDateOffset(-29 + i),
  hrv: Math.round(50 + Math.sin(i / 3) * 8 + Math.random() * 4),
  bodyBattery: Math.round(65 + Math.sin(i / 4) * 12 + Math.random() * 5),
}))

export const demoWeeklyStats = [
  { weekStart: getDateOffset(-49), sessionsCount: 5, avgMood: 4.0, totalDurationMin: 380, tssTotal: 380 },
  { weekStart: getDateOffset(-42), sessionsCount: 4, avgMood: 3.5, totalDurationMin: 310, tssTotal: 310 },
  { weekStart: getDateOffset(-35), sessionsCount: 6, avgMood: 4.2, totalDurationMin: 450, tssTotal: 450 },
  { weekStart: getDateOffset(-28), sessionsCount: 3, avgMood: 3.0, totalDurationMin: 240, tssTotal: 240 },
  { weekStart: getDateOffset(-21), sessionsCount: 5, avgMood: 4.5, totalDurationMin: 420, tssTotal: 420 },
  { weekStart: getDateOffset(-14), sessionsCount: 6, avgMood: 4.0, totalDurationMin: 490, tssTotal: 490 },
  { weekStart: getDateOffset(-7), sessionsCount: 5, avgMood: 3.8, totalDurationMin: 410, tssTotal: 410 },
]

export const demoExercises = [
  { exerciseName: 'Squat', entries: [{ date: getDateOffset(-21), maxKg: 85, totalVolume: 2040 }, { date: getDateOffset(-14), maxKg: 90, totalVolume: 2160 }, { date: getDateOffset(-7), maxKg: 95, totalVolume: 2280 }, { date: getDateOffset(-4), maxKg: 100, totalVolume: 2400 }] },
  { exerciseName: 'Développé couché', entries: [{ date: getDateOffset(-21), maxKg: 75, totalVolume: 1800 }, { date: getDateOffset(-14), maxKg: 77.5, totalVolume: 1860 }, { date: getDateOffset(-4), maxKg: 80, totalVolume: 1920 }] },
  { exerciseName: 'Tractions lestées', entries: [{ date: getDateOffset(-21), maxKg: 10, totalVolume: 240 }, { date: getDateOffset(-14), maxKg: 12.5, totalVolume: 300 }, { date: getDateOffset(-4), maxKg: 15, totalVolume: 360 }] },
  { exerciseName: 'Soulevé de terre', entries: [{ date: getDateOffset(-28), maxKg: 120, totalVolume: 2880 }, { date: getDateOffset(-14), maxKg: 125, totalVolume: 3000 }] },
  { exerciseName: 'Rowing barre', entries: [{ date: getDateOffset(-21), maxKg: 60, totalVolume: 1440 }, { date: getDateOffset(-4), maxKg: 65, totalVolume: 1560 }] },
]

export const demoProactiveAlerts = [
  {
    id: 'alert-1',
    type: 'proactive',
    date: getDateOffset(-1),
    content: 'Ta FC de repos a baissé de 3 bpm ce mois-ci (51 → 48 bpm). C\'est un signe concret de progression aérobie — ton cœur pompe plus efficacement. Continue sur cette lancée.',
  },
  {
    id: 'alert-2',
    type: 'proactive',
    date: getDateOffset(-3),
    content: 'FTP recalculé à 285W suite à ta sortie de mardi. Tes zones ont été mises à jour. Zone 2 : 162–178W, Zone 4 : 242–270W.',
  },
]

export const demoWeeklySummaries = [
  {
    id: 'ws-1',
    week_start_date: getDateOffset(-7),
    sessions_count: 5,
    content: `**Résumé**\nSemaine chargée mais bien gérée — 5 séances pour 410 min de travail total. La séance VO2max de jeudi a été exigeante mais productivement stressante.

**Points positifs**
• Progression en course à pied : allure au seuil à 3'58"/km, nouveau référentiel
• Très bon ressenti sur la sortie longue dimanche — économie d'effort visible

**Point d'attention**
La chaleur de jeudi a dégradé ta performance sur le dernier bloc VO2max. Pense à décaler les séances intenses au matin en été.

**Plan semaine prochaine**
On maintient le volume mais on réduit l'intensité — une seule séance seuil max. Priorité à la technique natation et à la récupération active en fin de semaine.`,
  },
]

function getDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
