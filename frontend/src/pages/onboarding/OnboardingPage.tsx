import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { apiPost } from '@/lib/api'
import { GarminOnboardingGuide } from '@/components/garmin/GarminOnboardingGuide'
import styles from './OnboardingPage.module.css'

const SPORTS = ['Triathlon', 'Cyclisme', 'Course à pied', 'Trail', 'Natation', 'Musculation', 'CrossFit', 'Sport collectif', 'Autre']
const LEVELS = [
  { value: 'beginner', label: 'Débutant', desc: 'Je débute ou reprends le sport' },
  { value: 'intermediate', label: 'Intermédiaire', desc: '2–4 séances/sem, quelques années d\'expérience' },
  { value: 'advanced', label: 'Avancé', desc: '5+ séances/sem, objectifs exigeants' },
  { value: 'competitor', label: 'Compétiteur', desc: 'Je participe à des compétitions régulières' },
]
const GOALS = ['Perte de poids', 'Amélioration des performances', 'Préparation compétition', 'Santé générale', 'Prise de masse']

const DEVICES: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'Garmin', label: 'Garmin', icon: '⌚', desc: 'HRV, Body Battery, sommeil, activités' },
  { id: 'Wahoo', label: 'Wahoo', icon: '🚴', desc: 'Home trainer, puissance, capteurs' },
  { id: 'Apple Health', label: 'Apple Health', icon: '🍎', desc: 'Activités iOS, fréquence cardiaque' },
  { id: 'Polar', label: 'Polar', icon: '📡', desc: 'HRV, FC, activités Polar' },
  { id: 'Suunto', label: 'Suunto', icon: '🔵', desc: 'Activités Suunto' },
  { id: 'Whoop', label: 'Whoop', icon: '💪', desc: 'Récupération, sommeil, HRV' },
  { id: 'Oura Ring', label: 'Oura Ring', icon: '💍', desc: 'HRV, sommeil, score de préparation' },
  { id: 'Saisie manuelle', label: 'Manuel', icon: '✏️', desc: 'Saisie manuelle des données' },
]

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
  const [garminConnected, setGarminConnected] = useState(false)
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

  const hasGarmin = form.devices.includes('Garmin')
  const showGarminGuide = step === 5 && hasGarmin

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
                  <span className={styles.levelLabel}>{lvl.label}</span>
                  <span className={styles.levelDesc}>{lvl.desc}</span>
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
            <p className={styles.hint}>Connecte tes appareils pour une analyse complète</p>

            {!showGarminGuide ? (
              <div className={styles.deviceGrid}>
                {DEVICES.map(device => (
                  <button
                    key={device.id}
                    type="button"
                    className={`${styles.deviceCard} ${form.devices.includes(device.id) ? styles.selected : ''}`}
                    onClick={() => toggleArray('devices', device.id)}
                  >
                    <span className={styles.deviceIcon}>{device.icon}</span>
                    <span className={styles.deviceName}>{device.label}</span>
                    <span className={styles.deviceDesc}>{device.desc}</span>
                    {form.devices.includes(device.id) && (
                      <span className={styles.deviceCheck}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <GarminOnboardingGuide
                  onConnected={() => setGarminConnected(true)}
                  onSkip={() => { /* garmin skipped */ }}
                />
              </div>
            )}

            {hasGarmin && !showGarminGuide && (
              <button
                className={styles.garminGuideBtn}
                onClick={() => setForm(f => ({ ...f }))}
                style={{ display: 'none' }}
              />
            )}
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
        ) : showGarminGuide && !garminConnected ? (
          <button className={styles.btnPrimary} onClick={handleFinish} disabled={loading}>
            {loading ? 'Enregistrement…' : 'Terminer sans connecter →'}
          </button>
        ) : (
          <button className={styles.btnPrimary} onClick={handleFinish} disabled={loading}>
            {loading ? 'Enregistrement…' : 'Commencer ✓'}
          </button>
        )}
      </div>
    </div>
  )
}
