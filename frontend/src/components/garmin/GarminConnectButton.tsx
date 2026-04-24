import { useState } from 'react'
import { apiPost } from '@/lib/api'
import styles from './GarminConnectButton.module.css'

interface Props {
  onConnected: () => void
}

type Step = 'idle' | 'form' | 'mfa' | 'loading'

export function GarminConnectButton({ onConnected }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('loading')
    try {
      const res = await apiPost<{ status: string; error?: string }>('/api/garmin/connect/start', { email, password })
      if (res.error) { setError(res.error); setStep('form'); return }
      if (res.status === 'mfa_required') {
        setStep('mfa')
      } else if (res.status === 'success') {
        onConnected()
        setStep('idle')
      }
    } catch (err) {
      setError((err as Error).message)
      setStep('form')
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('loading')
    try {
      const res = await apiPost<{ status: string; error?: string }>('/api/garmin/connect/mfa', { email, code: mfaCode })
      if (res.error) { setError(res.error); setStep('mfa'); return }
      onConnected()
      setStep('idle')
    } catch (err) {
      setError((err as Error).message)
      setStep('mfa')
    }
  }

  if (step === 'idle') {
    return (
      <button className={styles.btn} onClick={() => setStep('form')}>
        🔗 Connecter
      </button>
    )
  }

  if (step === 'loading') {
    return <span className={styles.loading}>Connexion…</span>
  }

  if (step === 'mfa') {
    return (
      <form onSubmit={handleMfa} className={styles.form}>
        <p className={styles.hint}>Code MFA (app Garmin Connect)</p>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          placeholder="123456"
          value={mfaCode}
          onChange={e => setMfaCode(e.target.value)}
          autoFocus
          maxLength={8}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.row}>
          <button type="button" className={styles.btnCancel} onClick={() => setStep('idle')}>Annuler</button>
          <button type="submit" className={styles.btn}>Valider</button>
        </div>
      </form>
    )
  }

  // step === 'form'
  return (
    <form onSubmit={handleStart} className={styles.form}>
      <input
        className={styles.input}
        type="email"
        placeholder="Email Garmin"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <input
        className={styles.input}
        type="password"
        placeholder="Mot de passe Garmin"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.row}>
        <button type="button" className={styles.btnCancel} onClick={() => setStep('idle')}>Annuler</button>
        <button type="submit" className={styles.btn}>Connecter</button>
      </div>
    </form>
  )
}
