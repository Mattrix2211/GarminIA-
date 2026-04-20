import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Auth.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/onboarding')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Créer un compte</h2>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <button type="submit" className={styles.btnPrimary} disabled={loading}>
        {loading ? 'Création…' : "S'inscrire"}
      </button>
      <p className={styles.link}>
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </form>
  )
}
