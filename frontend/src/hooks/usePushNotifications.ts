import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { DEMO_MODE } from '@/lib/demo'

type Permission = 'default' | 'granted' | 'denied'

export function usePushNotifications() {
  const [permission, setPermission] = useState<Permission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported] = useState(() => 'Notification' in window && 'serviceWorker' in navigator)

  useEffect(() => {
    if (!supported) return
    setPermission(Notification.permission)
    checkSubscription()
  }, [supported])

  async function checkSubscription() {
    if (DEMO_MODE) { setSubscribed(!!localStorage.getItem('push_subscribed')); return }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch { /* SW not ready */ }
  }

  const subscribe = useCallback(async () => {
    if (!supported) return false
    setLoading(true)
    try {
      if (DEMO_MODE) {
        const granted = await Notification.requestPermission()
        setPermission(granted)
        if (granted === 'granted') {
          localStorage.setItem('push_subscribed', '1')
          setSubscribed(true)
          new Notification('GarminIA activé !', {
            body: 'Tu recevras ton bilan matin et les rappels de séance.',
            icon: '/icons/icon-192.svg',
          })
          return true
        }
        return false
      }

      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      const { vapidKey } = await apiGet<{ vapidKey: string }>('/api/push/vapid-key')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })
      await apiPost('/api/push/subscribe', sub.toJSON())
      setSubscribed(true)
      return true
    } catch (err) {
      console.error('Push subscription failed:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    if (DEMO_MODE) {
      localStorage.removeItem('push_subscribed')
      setSubscribed(false)
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await apiPost('/api/push/unsubscribe', { endpoint: sub.endpoint })
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe failed:', err)
    }
  }, [])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(rawData, c => c.charCodeAt(0))
}
