import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { apiPost } from '@/lib/api'
import styles from './OnboardingPage.module.css'

const SPORTS = ['Triathlon', 'Cyclisme', 'Course à pied', 'Trail', 'Natation', 'Musculation', 'CrossFit', 'Sport collectif', 'Autre']
const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'competitor', label: 'Compétiteur' },
]
const GOALS = ['Perte de poids', 'Amélioration des performances', 'Préparation compétition', 'Santé générale', 'Prise de masse']
const DEVICES = ['Garmin', 'Wahoo', 'Apple Health', 'Polar', 'Suunto', 'Whoop', 'Oura Ring', 'Saisie manuelle']

interface FormData {
  firstName: string
  age: string
  weightKg: string
  heightCm: string
  sports: string[]
  level: string
  goals: string[]
  targetCompetitionDate: string
  devices: string[]
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    firstName: '', age: '', weightKg: '', heightCm: '',
    sports: [], level: '', goals: [], targetCompetitionDate: '', devices: [],
  })

  function toggleArray(key: 'sports' | 'goals' | 'devices', value: string) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }))
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    await apiPost('/api/profile', {
      userId: user.id,
      ...form,
      age: parseInt(form.age),
      weightKg: parseFloat(form.weightKg),
      heightCm: parseFloat(form.heightCm),
    })
    navigate('/')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.steps}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`${styles.dot} ${n <= step ? styles.active : ''}`} />
          ))}
        </div>
        <p className={styles.stepLabel}>Étape {step} / 5</p>
      </div>

      <div className={styles.content}>
        {step === 1 && (
          <div className={styles.step}>
            <h2>Ton profil</h2>
            <div className={styles.fields}>
              {[
                { id: 'firstName', label: 'Prénom', type: 'text', key: 'firstName' as const },
                { id: 'age', label: 'Âge', type: 'number', key: 'age' as const },
                { id: 'weightKg', label: 'Poids (kg)', type: 'number', key: 'weightKg' as const },
                { id: 'heightCm', label: 'Taille (cm)', type: 'number', key: 'heightCm' as const },
              ].map(field => (
                <div key={field.id} className={styles.field}>
                  <label htmlFor={field.id}>{field.label}</label>
                  <input
                    id={field.id}
                    type={field.type}
                    value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <h2>Ton sport</h2>
            <p className={styles.hint}>Sélectionne un ou plusieurs sports</p>
            <div className={styles.chips}>
              {SPORTS.map(sport => (
                <button
                  key={sport}
                  type="button"
                  className={`${styles.chip} ${form.sports.includes(sport) ? styles.selected : ''}`}
                  onClick={() => toggleArray('sports', sport)}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.step}>
            <h2>Ton niveau</h2>
            <div className={styles.levelCards}>
              {LEVELS.map(lvl => (
                <button
                  key={lvl.value}
                  type="button"
                  className={`${styles.levelCard} ${form.level === lvl.value ? styles.selected : ''}`}
                  onClick={() => setForm(f => ({ ...f, level: lvl.value }))}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={styles.step}>
            <h2>Tes objectifs</h2>
            <div className={styles.chips}>
              {GOALS.map(goal => (
                <button
                  key={goal}
                  type="button"
                  className={`${styles.chip} ${form.goals.includes(goal) ? styles.selected : ''}`}
                  onClick={() => toggleArray('goals', goal)}
                >
                  {goal}
                </button>
              ))}
            </div>
            {form.goals.includes('Préparation compétition') && (
              <div className={styles.field} style={{ marginTop: 16 }}>
                <label htmlFor="compDate">Date de la compétition</label>
                <input
                  id="compDate"
                  type="date"
                  value={form.targetCompetitionDate}
                  onChange={e => setForm(f => ({ ...f, targetCompetitionDate: e.target.value }))}
                />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className={styles.step}>
            <h2>Tes appareils</h2>
            <p className={styles.hint}>Tu pourras configurer les connexions après</p>
            <div className={styles.chips}>
              {DEVICES.map(device => (
                <button
                  key={device}
                  type="button"
                  className={`${styles.chip} ${form.devices.includes(device) ? styles.selected : ''}`}
                  onClick={() => toggleArray('devices', device)}
                >
                  {device}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {step > 1 && (
          <button className={styles.btnSecondary} onClick={() => setStep(s => s - 1)}>
            Précédent
          </button>
        )}
        {step < 5 ? (
          <button className={styles.btnPrimary} onClick={() => setStep(s => s + 1)}>
            Suivant
          </button>
        ) : (
          <button className={styles.btnPrimary} onClick={handleFinish} disabled={loading}>
            {loading ? 'Enregistrement…' : 'Commencer'}
          </button>
        )}
      </div>
    </div>
  )
}
