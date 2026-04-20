import { useState, useRef } from 'react'
import { RestTimer } from './RestTimer'
import { SetTracker } from './SetTracker'
import { SessionLogger } from './SessionLogger'
import type { SessionData, Exercise } from '@/pages/session/SessionPage'
import styles from './ClassicStepper.module.css'

interface Props {
  session: SessionData
  onFinish: (log: { durationMin: number; perceivedEffort: number; moodStars: number; notes: string }) => void
}

export function ClassicStepper({ session, onFinish }: Props) {
  const [step, setStep] = useState<'exercises' | 'log'>('exercises')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})
  const [showRest, setShowRest] = useState(false)
  const [currentSetForExercise, setCurrentSetForExercise] = useState(0)
  const [setData, setSetData] = useState<Record<string, { kg: number; reps: number }[]>>({})
  const startTime = useRef(Date.now())

  const exercises = session.exercises
  const current = exercises[currentIdx]
  const progress = (currentIdx / exercises.length) * 100

  function handleSetDone(kg?: number, reps?: number) {
    const key = current.name
    if (kg !== undefined && reps !== undefined) {
      setSetData(prev => ({
        ...prev,
        [key]: [...(prev[key] ?? []), { kg, reps }],
      }))
    }

    const done = (completedSets[currentIdx] ?? 0) + 1
    setCompletedSets(prev => ({ ...prev, [currentIdx]: done }))

    if (done < current.sets) {
      setCurrentSetForExercise(done)
      setShowRest(true)
    } else {
      setCurrentSetForExercise(0)
      if (currentIdx < exercises.length - 1) {
        setShowRest(true)
      } else {
        setStep('log')
      }
    }
  }

  function handleRestDone() {
    setShowRest(false)
    const done = completedSets[currentIdx] ?? 0
    if (done >= current.sets && currentIdx < exercises.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }

  function handleSkipRest() {
    setShowRest(false)
    const done = completedSets[currentIdx] ?? 0
    if (done >= current.sets && currentIdx < exercises.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }

  function handlePrev() {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1)
      setShowRest(false)
      setCurrentSetForExercise(0)
    }
  }

  if (step === 'log') {
    const elapsed = Math.round((Date.now() - startTime.current) / 60000)
    return <SessionLogger defaultDuration={elapsed} onSubmit={onFinish} setData={setData} sessionId={session.id} />
  }

  if (showRest) {
    const isLastSet = (completedSets[currentIdx] ?? 0) >= current.sets
    return (
      <RestTimer
        seconds={current.rest}
        label={isLastSet ? `Récupération avant ${exercises[currentIdx + 1]?.name}` : `Récupération — série ${(completedSets[currentIdx] ?? 0) + 1}/${current.sets}`}
        onDone={handleRestDone}
        onSkip={handleSkipRest}
      />
    )
  }

  const doneCount = completedSets[currentIdx] ?? 0

  return (
    <div className={styles.container}>
      {/* Barre de progression */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.stepCount}>{currentIdx + 1} / {exercises.length}</span>
        <h1 className={styles.sessionTitle}>{session.title}</h1>
      </div>

      {/* Exercice courant */}
      <div className={styles.exerciseCard}>
        <h2 className={styles.exerciseName}>{current.name}</h2>

        <div className={styles.exerciseMeta}>
          <div className={styles.metaBadge}>
            <span className={styles.metaLabel}>Séries</span>
            <span className={styles.metaValue}>{current.sets}</span>
          </div>
          <div className={styles.metaBadge}>
            <span className={styles.metaLabel}>Reps</span>
            <span className={styles.metaValue}>{current.reps}</span>
          </div>
          {current.duration && (
            <div className={styles.metaBadge}>
              <span className={styles.metaLabel}>Durée</span>
              <span className={styles.metaValue}>{current.duration}</span>
            </div>
          )}
          <div className={styles.metaBadge}>
            <span className={styles.metaLabel}>Repos</span>
            <span className={styles.metaValue}>{current.rest}s</span>
          </div>
        </div>

        {current.notes && <p className={styles.exerciseNotes}>{current.notes}</p>}

        {/* Indicateur de séries */}
        <div className={styles.setsIndicator}>
          {Array.from({ length: current.sets }).map((_, i) => (
            <div
              key={i}
              className={`${styles.setDot} ${i < doneCount ? styles.setDone : i === doneCount ? styles.setCurrent : ''}`}
            />
          ))}
        </div>

        {/* Suivi des charges si muscu */}
        {(session.sport === 'Musculation' || session.sport === 'CrossFit') && (
          <SetTracker
            exerciseName={current.name}
            setNumber={currentSetForExercise + 1}
            previousSets={setData[current.name] ?? []}
            onDone={handleSetDone}
          />
        )}
      </div>

      {/* Liste de tous les exercices */}
      <div className={styles.exerciseList}>
        {exercises.map((ex, i) => (
          <div
            key={i}
            className={`${styles.listItem} ${i === currentIdx ? styles.listActive : ''} ${i < currentIdx ? styles.listDone : ''}`}
          >
            <span className={styles.listCheck}>{i < currentIdx ? '✓' : i + 1}</span>
            <span className={styles.listName}>{ex.name}</span>
            <span className={styles.listMeta}>{ex.sets}×{ex.reps}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={handlePrev} disabled={currentIdx === 0}>
          ← Précédent
        </button>
        {session.sport !== 'Musculation' && session.sport !== 'CrossFit' ? (
          <button className={styles.btnPrimary} onClick={() => handleSetDone()}>
            Fait — Suivant →
          </button>
        ) : null}
      </div>
    </div>
  )
}
