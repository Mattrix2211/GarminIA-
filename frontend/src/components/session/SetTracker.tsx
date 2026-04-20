import { useState } from 'react'
import styles from './SetTracker.module.css'

interface PreviousSet { kg: number; reps: number }

interface Props {
  exerciseName: string
  setNumber: number
  previousSets: PreviousSet[]
  onDone: (kg: number, reps: number) => void
}

export function SetTracker({ exerciseName: _n, setNumber, previousSets, onDone }: Props) {
  const prevBest = previousSets.length > 0
    ? previousSets.reduce((best, s) => s.kg * s.reps > best.kg * best.reps ? s : best, previousSets[0])
    : null

  const lastSet = previousSets[previousSets.length - 1]
  const [kg, setKg] = useState(lastSet?.kg.toString() ?? '')
  const [reps, setReps] = useState(lastSet?.reps.toString() ?? '')

  function adjust(field: 'kg' | 'reps', delta: number) {
    if (field === 'kg') {
      const v = Math.max(0, (parseFloat(kg) || 0) + delta)
      setKg(Number.isInteger(v) ? v.toString() : v.toFixed(1))
    } else {
      setReps(r => String(Math.max(1, (parseInt(r) || 0) + delta)))
    }
  }

  return (
    <div className={styles.tracker}>
      <p className={styles.setLabel}>Série {setNumber}</p>

      {prevBest && (
        <p className={styles.prevBest}>
          Meilleur précédent : <strong>{prevBest.kg}kg × {prevBest.reps}</strong>
        </p>
      )}

      <div className={styles.inputs}>
        <div className={styles.inputGroup}>
          <button className={styles.adj} onClick={() => adjust('kg', -2.5)}>−</button>
          <div className={styles.inputWrap}>
            <input
              type="number"
              value={kg}
              onChange={e => setKg(e.target.value)}
              className={styles.input}
              placeholder="0"
              inputMode="decimal"
            />
            <span className={styles.inputLabel}>kg</span>
          </div>
          <button className={styles.adj} onClick={() => adjust('kg', 2.5)}>+</button>
        </div>

        <span className={styles.times}>×</span>

        <div className={styles.inputGroup}>
          <button className={styles.adj} onClick={() => adjust('reps', -1)}>−</button>
          <div className={styles.inputWrap}>
            <input
              type="number"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className={styles.input}
              placeholder="0"
              inputMode="numeric"
            />
            <span className={styles.inputLabel}>reps</span>
          </div>
          <button className={styles.adj} onClick={() => adjust('reps', 1)}>+</button>
        </div>
      </div>

      {/* Historique des séries de cette session */}
      {previousSets.length > 0 && (
        <div className={styles.history}>
          {previousSets.map((s, i) => (
            <span key={i} className={styles.historyItem}>
              S{i + 1}: {s.kg}kg×{s.reps}
            </span>
          ))}
        </div>
      )}

      <button
        className={styles.btnDone}
        onClick={() => onDone(parseFloat(kg) || 0, parseInt(reps) || 0)}
        disabled={!kg || !reps}
      >
        Série validée ✓
      </button>
    </div>
  )
}
