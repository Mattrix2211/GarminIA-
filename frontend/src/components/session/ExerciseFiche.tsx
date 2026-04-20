import { useState } from 'react'
import { getExercise, getMuscleColor } from '@/lib/exerciseDb'
import styles from './ExerciseFiche.module.css'

interface Props {
  exerciseName: string
  onClose: () => void
}

export function ExerciseFiche({ exerciseName, onClose }: Props) {
  const info = getExercise(exerciseName)
  const [gifError, setGifError] = useState(false)
  const [activeTab, setActiveTab] = useState<'instructions' | 'muscles' | 'tips'>('instructions')

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{exerciseName}</h2>
            {info && (
              <div className={styles.badges}>
                <span className={styles.badge}>{info.difficulty}</span>
                <span className={styles.badge}>{info.category}</span>
                {info.equipment.map(eq => (
                  <span key={eq} className={`${styles.badge} ${styles.badgeEquip}`}>{eq}</span>
                ))}
              </div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* GIF ou placeholder animé */}
        <div className={styles.gifArea}>
          {info?.gifUrl && !gifError ? (
            <img
              src={info.gifUrl}
              alt={`Démonstration ${exerciseName}`}
              className={styles.gif}
              onError={() => setGifError(true)}
            />
          ) : (
            <div className={styles.gifPlaceholder}>
              <MovementDiagram name={exerciseName} category={info?.category} />
            </div>
          )}
        </div>

        {info ? (
          <>
            <div className={styles.tabs}>
              {(['instructions', 'muscles', 'tips'] as const).map(tab => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'instructions' ? '📋 Technique' : tab === 'muscles' ? '💪 Muscles' : '⚡ Conseils'}
                </button>
              ))}
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'instructions' && (
                <ol className={styles.instructionList}>
                  {info.instructions.map((step, i) => (
                    <li key={i} className={styles.instructionItem}>
                      <span className={styles.stepNum}>{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {activeTab === 'muscles' && (
                <div className={styles.musclesSection}>
                  {info.primaryMuscles.length > 0 && (
                    <div className={styles.muscleGroup}>
                      <span className={styles.muscleGroupLabel}>Principaux</span>
                      <div className={styles.muscleTags}>
                        {info.primaryMuscles.map(m => (
                          <span
                            key={m}
                            className={styles.muscleTag}
                            style={{ borderColor: getMuscleColor(m), color: getMuscleColor(m) }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {info.secondaryMuscles.length > 0 && (
                    <div className={styles.muscleGroup}>
                      <span className={styles.muscleGroupLabel}>Secondaires</span>
                      <div className={styles.muscleTags}>
                        {info.secondaryMuscles.map(m => (
                          <span
                            key={m}
                            className={styles.muscleTag}
                            style={{ borderColor: `${getMuscleColor(m)}66`, color: 'var(--text-secondary)' }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tips' && (
                <ul className={styles.tipsList}>
                  {info.tips.map((tip, i) => (
                    <li key={i} className={styles.tipItem}>
                      <span className={styles.tipIcon}>→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className={styles.noInfo}>
            <p>Fiche non disponible pour cet exercice.</p>
            <p className={styles.noInfoSub}>Effectue le mouvement tel qu'indiqué dans les notes de ta séance.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MovementDiagram({ name, category }: { name: string; category?: string }) {
  const emoji = category === 'crossfit' ? '🔥' : category === 'cardio' ? '🏃' : '💪'
  return (
    <div className={styles.diagram}>
      <div className={styles.diagramEmoji}>{emoji}</div>
      <div className={styles.diagramPulse} />
      <p className={styles.diagramLabel}>{name}</p>
    </div>
  )
}
