import { useState, useEffect, useRef } from 'react'
import { SessionLogger } from './SessionLogger'
import type { SessionData } from '@/pages/session/SessionPage'
import styles from './AmrapMode.module.css'

interface Props {
  session: SessionData
  onFinish: (log: { durationMin: number; perceivedEffort: number; moodStars: number; notes: string }) => void
}

export function AmrapMode({ session, onFinish }: Props) {
  const totalSec = (session.amrapDurationMin ?? 20) * 60
  const [remaining, setRemaining] = useState(totalSec)
  const [running, setRunning] = useState(false)
  const [rounds, setRounds] = useState(0)
  const [step, setStep] = useState<'ready' | 'running' | 'done'>('ready')
  const audioCtxRef = useRef<AudioContext | null>(null)

  function beep(freq = 880, dur = 0.2) {
    try {
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new AudioContext())
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(); osc.stop(ctx.currentTime + dur)
    } catch (_) {}
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id)
          setRunning(false)
          setStep('done')
          beep(880, 0.1); setTimeout(() => beep(880, 0.1), 200); setTimeout(() => beep(1200, 0.4), 400)
          return 0
        }
        if (r <= 4) beep(660, 0.08)
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  function start() { setStep('running'); setRunning(true) }
  function togglePause() { setRunning(r => !r) }

  const min = Math.floor(remaining / 60)
  const sec = remaining % 60
  const pct = (remaining / totalSec) * 100

  if (step === 'done') {
    const elapsed = Math.round((totalSec - remaining) / 60)
    return <SessionLogger defaultDuration={elapsed} sessionId={session.id} setData={{}} onSubmit={onFinish} />
  }

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.header}>
        <h1>{session.title}</h1>
        <p className={styles.sport}>🔥 AMRAP</p>
      </div>

      {/* Chrono principal */}
      <div className={styles.timerSection}>
        <div className={styles.bigTimer} style={{ color: remaining <= 30 ? 'var(--danger)' : 'var(--accent)' }}>
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
        </div>
        <div className={styles.timerBar}>
          <div className={styles.timerFill} style={{ width: `${pct}%`, background: remaining <= 30 ? 'var(--danger)' : 'var(--accent)' }} />
        </div>
      </div>

      {/* Compteur de tours */}
      <div className={styles.roundSection}>
        <p className={styles.roundLabel}>Tours accomplis</p>
        <div className={styles.roundCounter}>
          <button
            className={styles.roundMinus}
            onClick={() => setRounds(r => Math.max(0, r - 1))}
            disabled={rounds === 0}
          >
            −
          </button>
          <span className={styles.roundNum}>{rounds}</span>
          <button
            className={styles.roundPlus}
            onClick={() => { setRounds(r => r + 1); beep(1000, 0.08) }}
          >
            + 1 Tour
          </button>
        </div>
      </div>

      {/* Exercices du circuit */}
      <div className={styles.circuit}>
        <p className={styles.circuitLabel}>Circuit</p>
        {session.exercises.map((ex, i) => (
          <div key={i} className={styles.circuitItem}>
            <span className={styles.circuitNum}>{i + 1}</span>
            <div>
              <strong>{ex.name}</strong>
              <span> — {ex.reps}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Contrôles */}
      <div className={styles.controls}>
        {step === 'ready' ? (
          <button className={styles.btnStart} onClick={start}>Lancer le chrono ▶</button>
        ) : (
          <>
            <button className={styles.btnPause} onClick={togglePause}>
              {running ? '⏸ Pause' : '▶ Reprendre'}
            </button>
            <button className={styles.btnStop} onClick={() => { setRunning(false); setStep('done') }}>
              Terminer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
