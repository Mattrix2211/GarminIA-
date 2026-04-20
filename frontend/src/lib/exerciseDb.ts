export interface ExerciseInfo {
  nameFr: string
  nameEn: string
  category: 'force' | 'cardio' | 'mobilite' | 'crossfit'
  difficulty: 'débutant' | 'intermédiaire' | 'avancé'
  equipment: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  tips: string[]
  gifUrl: string | null
}

const BASE_GIF = 'https://v2.exercisedb.io/image'

const EXERCISE_DB: Record<string, ExerciseInfo> = {
  'squat': {
    nameFr: 'Squat', nameEn: 'Barbell Squat',
    category: 'force', difficulty: 'intermédiaire',
    equipment: ['Barre', 'Rack'],
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischio-jambiers', 'Mollets', 'Core'],
    instructions: [
      'Placer la barre sur les trapèzes, pieds à largeur d\'épaules',
      'Descendre en poussant les hanches vers l\'arrière, genoux dans l\'axe des pieds',
      'Casser le parallèle (cuisse en dessous de l\'horizontale)',
      'Remonter en poussant dans le sol, garder le buste droit',
      'Verrouiller les hanches et les genoux en haut',
    ],
    tips: [
      'Regarder légèrement vers le bas, pas au plafond',
      'Respirer avant de descendre, expirer sur la montée',
      'Si les talons décollent : travailler la mobilité cheville',
    ],
    gifUrl: `${BASE_GIF}/0685`,
  },
  'développé couché': {
    nameFr: 'Développé couché', nameEn: 'Barbell Bench Press',
    category: 'force', difficulty: 'intermédiaire',
    equipment: ['Barre', 'Banc'],
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Triceps', 'Deltoïdes antérieurs'],
    instructions: [
      'S\'allonger sur le banc, yeux sous la barre',
      'Saisir la barre légèrement plus large que les épaules',
      'Décoller la barre, la ramener à hauteur de poitrine (milieu du sternum)',
      'Pousser la barre vers le haut en arc de cercle léger',
      'Verrouiller les coudes sans les hyperextendre',
    ],
    tips: [
      'Garder les pieds à plat sur le sol',
      'Cambrer légèrement le bas du dos (arc naturel)',
      'Coudes à 45–75° du corps, pas à 90°',
    ],
    gifUrl: `${BASE_GIF}/0297`,
  },
  'soulevé de terre': {
    nameFr: 'Soulevé de terre', nameEn: 'Deadlift',
    category: 'force', difficulty: 'avancé',
    equipment: ['Barre'],
    primaryMuscles: ['Ischio-jambiers', 'Fessiers', 'Érecteurs spinaux'],
    secondaryMuscles: ['Quadriceps', 'Trapèzes', 'Avant-bras'],
    instructions: [
      'Pieds sous la barre (10 cm), largeur du bassin',
      'Se pencher, saisir la barre, bras en dehors des genoux',
      'Descendre les hanches, dos droit, poitrine haute',
      'Pousser dans le sol et tirer la barre en longeant les tibias',
      'Verrouiller en haut en contractant fessiers et core',
      'Redescendre en contrôlant : hanches d\'abord, puis genoux',
    ],
    tips: [
      'La barre doit rester en contact avec le corps toute la montée',
      'Prendre une grande inspiration et brider le core avant de tirer',
      'Ne pas arrondir le bas du dos',
    ],
    gifUrl: `${BASE_GIF}/0660`,
  },
  'tractions': {
    nameFr: 'Tractions', nameEn: 'Pull-Up',
    category: 'force', difficulty: 'intermédiaire',
    equipment: ['Barre de tractions'],
    primaryMuscles: ['Grand dorsal'],
    secondaryMuscles: ['Biceps', 'Rhomboïdes', 'Trapèzes inférieurs'],
    instructions: [
      'Saisir la barre en pronation, largeur légèrement supérieure aux épaules',
      'Se laisser pendre, bras tendus, épaules actives (déprimées)',
      'Tirer en ramenant les coudes vers les hanches',
      'Monter jusqu\'à ce que le menton passe au-dessus de la barre',
      'Redescendre lentement (2–3 secondes)',
    ],
    tips: [
      'Engager le core, ne pas balancer',
      'Penser à "écraser des oranges dans les aisselles"',
      'En supination : biceps plus sollicités (chin-up)',
    ],
    gifUrl: `${BASE_GIF}/3293`,
  },
  'tractions lestées': {
    nameFr: 'Tractions lestées', nameEn: 'Weighted Pull-Up',
    category: 'force', difficulty: 'avancé',
    equipment: ['Barre de tractions', 'Ceinture lestée'],
    primaryMuscles: ['Grand dorsal'],
    secondaryMuscles: ['Biceps', 'Rhomboïdes', 'Trapèzes inférieurs'],
    instructions: [
      'Attacher le lest à la ceinture, même technique que la traction normale',
      'Contrôler particulièrement la descente avec le lest supplémentaire',
      'Réduire le nombre de reps, maintenir la qualité d\'exécution',
    ],
    tips: [
      'Maîtriser les tractions non lestées avant d\'ajouter du poids',
      'Le lest amplifie les erreurs techniques — ne pas compromettre la forme',
    ],
    gifUrl: null,
  },
  'rowing barre': {
    nameFr: 'Rowing barre', nameEn: 'Barbell Row',
    category: 'force', difficulty: 'intermédiaire',
    equipment: ['Barre'],
    primaryMuscles: ['Grand dorsal', 'Rhomboïdes'],
    secondaryMuscles: ['Biceps', 'Trapèzes', 'Érecteurs spinaux'],
    instructions: [
      'Saisir la barre en pronation, debout, pieds à largeur d\'épaules',
      'Se pencher à ~45°, dos droit, barre suspendue devant',
      'Tirer la barre vers le nombril en contractant les omoplates',
      'Marquer une pause en haut, redescendre en contrôlant',
    ],
    tips: [
      'Ne pas balancer le dos pour aider la montée',
      'Coudes proches du corps pour plus de dorsal',
      'Coudes écartés pour plus de deltoïdes postérieurs',
    ],
    gifUrl: `${BASE_GIF}/0030`,
  },
  'fentes bulgares': {
    nameFr: 'Fentes bulgares', nameEn: 'Bulgarian Split Squat',
    category: 'force', difficulty: 'avancé',
    equipment: ['Banc', 'Haltères'],
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischio-jambiers', 'Core'],
    instructions: [
      'Pied arrière sur un banc ou une box (hauteur genou environ)',
      'Pied avant suffisamment avancé pour que le genou reste derrière la pointe du pied',
      'Descendre verticalement, genou avant dans l\'axe',
      'Le genou arrière frôle le sol sans toucher',
      'Pousser dans le talon avant pour remonter',
    ],
    tips: [
      'Commencer sans poids pour trouver son équilibre',
      'Plus le pied avant est loin : plus de fessiers. Proche : plus de quads',
      'Garder le buste droit, ne pas pencher vers l\'avant',
    ],
    gifUrl: `${BASE_GIF}/1765`,
  },
  'presse à cuisses': {
    nameFr: 'Presse à cuisses', nameEn: 'Leg Press',
    category: 'force', difficulty: 'débutant',
    equipment: ['Machine leg press'],
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischio-jambiers'],
    instructions: [
      'S\'asseoir dans la machine, dos bien plaqué au dossier',
      'Pieds sur la plateforme, largeur épaules ou légèrement plus',
      'Déverrouiller et descendre lentement jusqu\'à 90° de flexion',
      'Pousser en contractant quadriceps et fessiers sans verrouiller les genoux',
    ],
    tips: [
      'Ne jamais verrouiller les genoux en extension',
      'Pieds hauts : plus de fessiers. Pieds bas : plus de quads',
      'Ne pas laisser le bas du dos se décoller du dossier',
    ],
    gifUrl: `${BASE_GIF}/0453`,
  },
  'leg curl couché': {
    nameFr: 'Leg curl couché', nameEn: 'Lying Leg Curl',
    category: 'force', difficulty: 'débutant',
    equipment: ['Machine leg curl'],
    primaryMuscles: ['Ischio-jambiers'],
    secondaryMuscles: ['Mollets', 'Fessiers'],
    instructions: [
      'S\'allonger face vers le bas, la barre d\'appui juste derrière les chevilles',
      'Saisir les poignées pour stabiliser le bassin',
      'Fléchir les genoux en ramenant les talons vers les fessiers',
      'Contrôler la descente (eccentric lent : 3 secondes)',
    ],
    tips: [
      'Ne pas soulever le bassin en tirant',
      'Eccentric contrôlé = 2x plus d\'hypertrophie',
      'Penser à pointer les orteils vers le bas pour plus d\'ischio',
    ],
    gifUrl: `${BASE_GIF}/0654`,
  },
  'mollets debout': {
    nameFr: 'Mollets debout', nameEn: 'Standing Calf Raise',
    category: 'force', difficulty: 'débutant',
    equipment: ['Machine mollets ou marche'],
    primaryMuscles: ['Soléaire', 'Gastrocnémien'],
    secondaryMuscles: [],
    instructions: [
      'Placer les épaules sous les appuis, pointes de pieds sur la plateforme',
      'Descendre les talons en dessous du niveau de la plateforme',
      'Monter sur la pointe des pieds le plus haut possible',
      'Marquer une pause de 1 seconde en haut',
    ],
    tips: [
      'Amplitude complète : talons bas en bas, contraction maximale en haut',
      'Les mollets récupèrent vite — peuvent être travaillés très souvent',
      'Varier l\'orientation des pieds (parallèles / en dedans / en dehors)',
    ],
    gifUrl: `${BASE_GIF}/0193`,
  },
  'développé militaire': {
    nameFr: 'Développé militaire', nameEn: 'Barbell Overhead Press',
    category: 'force', difficulty: 'intermédiaire',
    equipment: ['Barre'],
    primaryMuscles: ['Deltoïdes antérieurs et médians'],
    secondaryMuscles: ['Triceps', 'Core', 'Trapèzes'],
    instructions: [
      'Barre sur les deltoïdes antérieurs, prise légèrement plus large que les épaules',
      'Buster rentré, core gainé, fessiers contractés',
      'Pousser la barre verticalement au-dessus de la tête',
      'En haut : tête légèrement avancée, barre au-dessus du milieu du pied',
      'Redescendre lentement en contrôlant',
    ],
    tips: [
      'Ne pas cambrer le bas du dos pour compenser',
      'Coudes légèrement vers l\'avant, pas sur le côté',
      'Garder les poignets droits (pas en extension arrière)',
    ],
    gifUrl: `${BASE_GIF}/0066`,
  },
  'burpees': {
    nameFr: 'Burpees', nameEn: 'Burpee',
    category: 'crossfit', difficulty: 'intermédiaire',
    equipment: [],
    primaryMuscles: ['Full body'],
    secondaryMuscles: ['Cardio'],
    instructions: [
      'Départ debout',
      'Descendre en squat, poser les mains au sol',
      'Sauter les pieds en arrière : position pompe',
      'Faire une pompe (chest to ground en CrossFit)',
      'Sauter les pieds vers les mains',
      'Sauter vers le haut, bras au-dessus de la tête, clapper',
    ],
    tips: [
      'Rythme régulier plutôt que départ explosif et pause',
      'Chest-to-ground : poitrine, cuisses et mains touchent le sol',
      'En compétition : le saut ne nécessite pas obligatoirement un clap selon le standard',
    ],
    gifUrl: `${BASE_GIF}/3544`,
  },
  'pull-ups': {
    nameFr: 'Pull-ups', nameEn: 'Pull-Up',
    category: 'crossfit', difficulty: 'intermédiaire',
    equipment: ['Barre de tractions'],
    primaryMuscles: ['Grand dorsal'],
    secondaryMuscles: ['Biceps', 'Core'],
    instructions: [
      'Saisir la barre, bras tendus',
      'Tirer le corps vers le haut, menton au-dessus de la barre',
      'Redescendre à bras tendus avant de recommencer',
    ],
    tips: [
      'En kipping : utiliser l\'élan des hanches pour enchaîner les reps',
      'En strict : bras tendus à chaque rep, mouvement pur sans élan',
    ],
    gifUrl: `${BASE_GIF}/3293`,
  },
  'air squats': {
    nameFr: 'Air Squats', nameEn: 'Air Squat',
    category: 'crossfit', difficulty: 'débutant',
    equipment: [],
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Core'],
    instructions: [
      'Pieds à largeur d\'épaules, orteils légèrement vers l\'extérieur',
      'Bras tendus devant pour l\'équilibre',
      'Descendre en cassant le parallèle (hanches sous les genoux)',
      'Remonter en poussant dans les talons',
    ],
    tips: [
      'Poitrine haute, regard légèrement vers le bas',
      'Genoux dans l\'axe des orteils, ne pas les laisser rentrer',
    ],
    gifUrl: null,
  },
  'kettlebell swings': {
    nameFr: 'Kettlebell Swings', nameEn: 'Kettlebell Swing',
    category: 'crossfit', difficulty: 'intermédiaire',
    equipment: ['Kettlebell'],
    primaryMuscles: ['Fessiers', 'Ischio-jambiers'],
    secondaryMuscles: ['Core', 'Épaules', 'Avant-bras'],
    instructions: [
      'Kettlebell au sol, 30 cm devant les pieds',
      'Saisir en hip hinge (pas en squat), dos droit',
      'Lancer le KB entre les jambes (hiking pass)',
      'Propulser par extension explosive des hanches',
      'En American Swing : KB monte jusqu\'au-dessus de la tête',
      'Laisser redescendre et répéter',
    ],
    tips: [
      'C\'est un mouvement de hanches, pas de squat ni d\'épaules',
      'Serrer les fessiers au point le plus haut',
      'Ne pas laisser le dos se courber en bas',
    ],
    gifUrl: `${BASE_GIF}/0536`,
  },
  'pompes': {
    nameFr: 'Pompes', nameEn: 'Push-Up',
    category: 'force', difficulty: 'débutant',
    equipment: [],
    primaryMuscles: ['Pectoraux', 'Triceps'],
    secondaryMuscles: ['Deltoïdes antérieurs', 'Core'],
    instructions: [
      'Position planche, mains légèrement plus larges que les épaules',
      'Corps aligné (tête, épaules, hanches, chevilles)',
      'Descendre la poitrine vers le sol, coudes à 45–75°',
      'Pousser pour revenir à la position de départ',
    ],
    tips: [
      'Ne pas laisser les hanches tomber ou monter',
      'Regarder légèrement en avant (pas le sol, pas devant)',
      'Pour rendre plus difficile : pieds surélevés, ajouter un gilet lesté',
    ],
    gifUrl: null,
  },
  'planche': {
    nameFr: 'Planche (Plank)', nameEn: 'Plank',
    category: 'force', difficulty: 'débutant',
    equipment: [],
    primaryMuscles: ['Core', 'Transverse'],
    secondaryMuscles: ['Épaules', 'Fessiers'],
    instructions: [
      'Sur les avant-bras ou mains tendues, corps aligné',
      'Contracter core, fessiers et jambes',
      'Maintenir la position sans laisser le bassin tomber',
    ],
    tips: [
      'Penser à pousser le sol avec les coudes (gainage plus efficace)',
      'Respirer normalement, ne pas retenir le souffle',
      'Progresser en durée puis passer à des variantes dynamiques',
    ],
    gifUrl: null,
  },
  'hip thrust': {
    nameFr: 'Hip Thrust', nameEn: 'Hip Thrust',
    category: 'force', difficulty: 'intermédiaire',
    equipment: ['Barre', 'Banc'],
    primaryMuscles: ['Fessiers'],
    secondaryMuscles: ['Ischio-jambiers', 'Core'],
    instructions: [
      'Épaules appuyées sur le banc, barre sur les hanches (avec pad de protection)',
      'Pieds à plat, à largeur d\'épaules, genoux à 90° au point haut',
      'Descendre les hanches vers le sol',
      'Pousser par extension explosive des hanches jusqu\'à l\'alignement',
      'Contracter les fessiers maximum en haut, tenir 1 seconde',
    ],
    tips: [
      'Ne pas cambrer le bas du dos en haut (hyperextension lombaire)',
      'Les pieds plus loin du banc = plus de fessiers',
      'Menton rentré, regard vers le haut ou droit devant',
    ],
    gifUrl: null,
  },
}

const ALIASES: Record<string, string> = {
  'squat barre': 'squat',
  'squat barbell': 'squat',
  'bench press': 'développé couché',
  'deadlift': 'soulevé de terre',
  'rdl': 'soulevé de terre',
  'pull up': 'tractions',
  'chin up': 'tractions',
  'rowing': 'rowing barre',
  'overhead press': 'développé militaire',
  'ohp': 'développé militaire',
  'kb swing': 'kettlebell swings',
  'push up': 'pompes',
  'plank': 'planche',
}

export function getExercise(nameFr: string): ExerciseInfo | null {
  const key = nameFr.toLowerCase().trim()
  if (EXERCISE_DB[key]) return EXERCISE_DB[key]
  const aliasKey = ALIASES[key]
  if (aliasKey && EXERCISE_DB[aliasKey]) return EXERCISE_DB[aliasKey]
  for (const [dbKey, info] of Object.entries(EXERCISE_DB)) {
    if (key.includes(dbKey) || dbKey.includes(key)) return info
  }
  return null
}

export function getMuscleColor(muscle: string): string {
  const muscleGroups: Record<string, string> = {
    'Quadriceps': '#c8f064', 'Fessiers': '#c8f064', 'Ischio-jambiers': '#c8f064',
    'Mollets': '#c8f064', 'Soléaire': '#c8f064', 'Gastrocnémien': '#c8f064',
    'Pectoraux': '#6c63ff', 'Deltoïdes antérieurs': '#6c63ff', 'Deltoïdes médians': '#6c63ff',
    'Grand dorsal': '#ff7c5c', 'Rhomboïdes': '#ff7c5c', 'Trapèzes': '#ff7c5c',
    'Trapèzes inférieurs': '#ff7c5c', 'Érecteurs spinaux': '#ff7c5c',
    'Biceps': '#55cccc', 'Triceps': '#55cccc', 'Avant-bras': '#55cccc',
    'Core': '#ffaa33', 'Transverse': '#ffaa33',
    'Full body': '#c8f064',
  }
  return muscleGroups[muscle] ?? '#a0a0a0'
}
