import { Router } from 'express'
import webpush from 'web-push'
import { supabaseAdmin } from '../db/supabase'

export const pushRouter = Router()

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:contact@garminia.app'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

pushRouter.get('/vapid-key', (_req, res) => {
  res.json({ vapidKey: VAPID_PUBLIC })
})

pushRouter.post('/subscribe', async (req, res) => {
  const userId = (req as any).userId
  const { endpoint, keys, expirationTime } = req.body

  if (!endpoint || !keys) return res.status(400).json({ error: 'Invalid subscription' })

  await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      expiration_time: expirationTime ?? null,
    }, { onConflict: 'user_id,endpoint' })

  res.json({ ok: true })
})

pushRouter.post('/unsubscribe', async (req, res) => {
  const userId = (req as any).userId
  const { endpoint } = req.body

  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  res.json({ ok: true })
})

// Fonction utilitaire utilisée par les autres services pour envoyer une notif
export async function sendPushToUser(userId: string, payload: {
  title: string; body: string; url?: string; tag?: string
}) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subs?.length) return

  const promises = subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ ...payload, icon: '/icons/icon-192.svg' })
    ).catch((err: { statusCode?: number }) => {
      if (err.statusCode === 410) {
        supabaseAdmin.from('push_subscriptions').delete()
          .eq('user_id', userId).eq('endpoint', sub.endpoint)
      }
    })
  )
  await Promise.allSettled(promises)
}
