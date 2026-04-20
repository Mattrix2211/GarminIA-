import { useEffect, useRef } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const SYNC_INTERVAL_MS = 30 * 60 * 1000 // 30 min
const LAST_SYNC_KEY = 'garmin_last_sync'

export function useGarminSync() {
  const { user } = useAuthStore()
  const syncing = useRef(false)

  useEffect(() => {
    if (!user) return

    async function maybeSyncGarmin() {
      if (syncing.current) return

      const lastSync = localStorage.getItem(LAST_SYNC_KEY)
      const now = Date.now()

      if (lastSync && now - parseInt(lastSync) < SYNC_INTERVAL_MS) return

      try {
        const { connected } = await apiGet<{ connected: boolean }>('/api/garmin/status')
        if (!connected) return

        syncing.current = true
        await apiPost('/api/garmin/sync', { date: new Date().toISOString().split('T')[0] })
        localStorage.setItem(LAST_SYNC_KEY, now.toString())
      } catch {
        // Silencieux — la sync Garmin est best-effort
      } finally {
        syncing.current = false
      }
    }

    // Sync au démarrage après 2s (laisser le temps à l'auth de s'initialiser)
    const timer = setTimeout(maybeSyncGarmin, 2000)
    return () => clearTimeout(timer)
  }, [user])
}
