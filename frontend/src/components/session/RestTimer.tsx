import { useState, useEffect, useRef } from 'react'
import styles from './RestTimer.module.css'

interface Props {
  seconds: number
  label: string
  onDone: () => void
  onSkip: () => void
}

const PRESETS = [30, 60, 90, 120, 180]

export function RestTimer({ seconds: initialSeconds, label, onDone, onSkip }: Props) {
  const [total, setTotal] = useState(initialSeconds)
  const [remaining, setRemaining] = useState(initialSeconds)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  function beep(freq = 880, dur = 0.15) {
    try {
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new AudioContext())
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + dur)
    } catch (_) {}
  }

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          // Triple beep à la fin
          beep(880, 0.1)
          setTimeout(() => beep(880, 0.1), 150)
          setTimeout(() => { beep(1100, 0.3); onDone() }, 300)
          return 0
        }
        if (r <= 4) beep(660, 0.08) // bip de compte à rebours
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [running, onDone])

  function togglePause() {
    setRunning(r => !r)
  }

  function reset() {
    setRemaining(total)
    setRunning(true)
  }

  function setPreset(s: number) {
    setTotal(s)
    setRemaining(s)
    setRunning(true)
  }

  const pct = (remaining / total) * 100
  const circumference = 2 * Math.PI * 54
  const strokeDash = (pct / 100) * circumference

  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <div className={styles.screen}>
      <p className={styles.label}>{label}</p>

      {/* Cercle SVG */}
      <div className={styles.circle}>
        <svg viewBox="0 0 120 120" width="200" height="200">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={remaining <= 5 ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <div className={styles.time}>
          {min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : sec}
          <span className={styles.unit}>{min > 0 ? '' : 's'}</span>
        </div>
      </div>

      {/* Contrôles */}
      <div className={styles.controls}>
        <button className={styles.btnControl} onClick={reset}>↺</button>
        <button className={styles.btnMain} onClick={togglePause}>
          {running ? '⏸' : '▶'}
        </button>
        <button className={styles.btnControl} onClick={onSkip}>→</button>
      </div>

      {/* Presets */}
      <div className={styles.presets}>
        {PRESETS.map(p => (
          <button
            key={p}
            className={`${styles.preset} ${total === p ? styles.presetActive : ''}`}
            onClick={() => setPreset(p)}
          >
            {p < 60 ? `${p}s` : `${p / 60}min`}
          </button>
        ))}
      </div>

      <button className={styles.skipText} onClick={onSkip}>
        Passer la récupération
      </button>
    </div>
  )
}
