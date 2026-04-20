import { useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import styles from './GarminConnectButton.module.css'

interface Props {
  onConnected: () => void
}

export function GarminConnectButton({ onConnected }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    setLoading(true)
    setError('')
    try {
      const { authorizeUrl } = await apiGet<{ authorizeUrl: string }>('/api/garmin/oauth/start')

      const popup = window.open(authorizeUrl, 'garmin-auth', 'width=600,height=700,scrollbars=yes')
      if (!popup) { setError('Active les popups pour connecter Garmin.'); setLoading(false); return }

      function onMessage(e: MessageEvent) {
        if (e.origin !== window.location.origin) return
        if (e.data?.type !== 'GARMIN_OAUTH') return
        window.removeEventListener('message', onMessage)

        apiPost('/api/garmin/oauth/callback', {
          oauth_token: e.data.code,
          oauth_verifier: e.data.state,
        })
          .then(() => { onConnected(); setLoading(false) })
          .catch(err => { setError((err as Error).message); setLoading(false) })
      }

      window.addEventListener('message', onMessage)

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          window.removeEventListener('message', onMessage)
          setLoading(false)
        }
      }, 500)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <button className={styles.btn} onClick={handleConnect} disabled={loading}>
        {loading ? '…' : '🔗 Garmin'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
