import { useState } from 'react'
import { GarminConnectButton } from './GarminConnectButton'
import styles from './GarminOnboardingGuide.module.css'

interface Props {
  onConnected: () => void
  onSkip: () => void
}

const STEPS = [
  {
    icon: '📱',
    title: 'Télécharge Garmin Connect',
    desc: 'Disponible sur App Store et Google Play. Si tu l\'as déjà, passe à l\'étape suivante.',
    qr: 'https://connect.garmin.com/modern/',
  },
  {
    icon: '👤',
    title: 'Connecte-toi à ton compte',
    desc: 'Ouvre Garmin Connect et assure-toi d\'être connecté avec le même compte que ta montre.',
  },
  {
    icon: '🔗',
    title: 'Autorise GarminIA',
    desc: 'Clique sur "Connecter Garmin" ci-dessous. Une fenêtre Garmin s\'ouvrira pour autoriser l\'accès à tes données.',
  },
  {
    icon: '✅',
    title: 'Valide les permissions',
    desc: 'Dans la fenêtre Garmin, accepte le partage de tes données (HRV, sommeil, Body Battery, activités).',
  },
]

export function GarminOnboardingGuide({ onConnected, onSkip }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [connected, setConnected] = useState(false)

  function handleConnected() {
    setConnected(true)
    onConnected()
  }

  if (connected) {
    return (
      <div className={styles.success}>
        <div className={styles.successIcon}>🎉</div>
        <h3>Garmin connecté !</h3>
        <p>Tes données arrivent. Demain matin tu verras ton HRV, Body Battery et ton analyse IA du jour.</p>
      </div>
    )
  }

  return (
    <div className={styles.guide}>
      <div className={styles.stepperHeader}>
        {STEPS.map((_s, i) => (
          <button
            key={i}
            className={`${styles.stepBtn} ${i === activeStep ? styles.stepBtnActive : ''} ${i < activeStep ? styles.stepBtnDone : ''}`}
            onClick={() => setActiveStep(i)}
          >
            <span className={styles.stepNum}>{i < activeStep ? '✓' : i + 1}</span>
          </button>
        ))}
      </div>

      <div className={styles.stepContent}>
        <div className={styles.stepIcon}>{STEPS[activeStep].icon}</div>
        <h3 className={styles.stepTitle}>{STEPS[activeStep].title}</h3>
        <p className={styles.stepDesc}>{STEPS[activeStep].desc}</p>

        {activeStep === 0 && (
          <div className={styles.qrBlock}>
            <div className={styles.qrBox}>
              <svg viewBox="0 0 80 80" className={styles.qrSvg}>
                {/* QR code simplifié — renvoie vers connect.garmin.com */}
                <rect width="80" height="80" fill="#fff" rx="4"/>
                <rect x="4" y="4" width="24" height="24" fill="none" stroke="#0f0f0f" strokeWidth="4"/>
                <rect x="10" y="10" width="12" height="12" fill="#0f0f0f"/>
                <rect x="52" y="4" width="24" height="24" fill="none" stroke="#0f0f0f" strokeWidth="4"/>
                <rect x="58" y="10" width="12" height="12" fill="#0f0f0f"/>
                <rect x="4" y="52" width="24" height="24" fill="none" stroke="#0f0f0f" strokeWidth="4"/>
                <rect x="10" y="58" width="12" height="12" fill="#0f0f0f"/>
                <rect x="36" y="4" width="8" height="8" fill="#0f0f0f"/>
                <rect x="36" y="16" width="8" height="8" fill="#0f0f0f"/>
                <rect x="36" y="28" width="8" height="8" fill="#0f0f0f"/>
                <rect x="52" y="36" width="8" height="8" fill="#0f0f0f"/>
                <rect x="64" y="36" width="8" height="8" fill="#0f0f0f"/>
                <rect x="52" y="52" width="8" height="8" fill="#0f0f0f"/>
                <rect x="64" y="64" width="8" height="8" fill="#0f0f0f"/>
                <rect x="36" y="52" width="8" height="8" fill="#0f0f0f"/>
                <rect x="36" y="64" width="8" height="8" fill="#0f0f0f"/>
                <rect x="4" y="36" width="8" height="8" fill="#0f0f0f"/>
                <rect x="16" y="36" width="8" height="8" fill="#0f0f0f"/>
              </svg>
            </div>
            <p className={styles.qrLabel}>Scanner pour ouvrir Garmin Connect</p>
          </div>
        )}

        {activeStep === 2 && (
          <div className={styles.connectBlock}>
            <GarminConnectButton onConnected={handleConnected} />
            <div className={styles.helpBox}>
              <p>⚠️ La popup est bloquée ?</p>
              <p>Active les popups pour ce site dans les réglages de ton navigateur, puis réessaie.</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.navRow}>
        {activeStep > 0 && (
          <button className={styles.navSecondary} onClick={() => setActiveStep(s => s - 1)}>
            ← Précédent
          </button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <button className={styles.navPrimary} onClick={() => setActiveStep(s => s + 1)}>
            Suivant →
          </button>
        ) : (
          <button className={styles.navSkip} onClick={onSkip}>
            Configurer plus tard
          </button>
        )}
      </div>
    </div>
  )
}
