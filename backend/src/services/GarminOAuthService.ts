import crypto from 'crypto'
import { supabaseAdmin } from '../lib/supabase'

const GARMIN_AUTH_URL = 'https://connect.garmin.com/oauth-service/oauth/request_token'
const GARMIN_ACCESS_URL = 'https://connect.garmin.com/oauth-service/oauth/access_token'
const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm'

const CLIENT_ID = process.env.GARMIN_CLIENT_ID!
const CLIENT_SECRET = process.env.GARMIN_CLIENT_SECRET!

interface OAuthTokens {
  accessToken: string
  accessTokenSecret: string
  userId: string
}

function generateOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  tokenSecret = '',
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CLIENT_ID,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...params,
  }

  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&')

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&')

  const signingKey = `${encodeURIComponent(CLIENT_SECRET)}&${encodeURIComponent(tokenSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  oauthParams.oauth_signature = signature

  return 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ')
}

export async function getRequestToken(): Promise<{ token: string; tokenSecret: string; authorizeUrl: string }> {
  const url = GARMIN_AUTH_URL
  const header = generateOAuthHeader('POST', url, {
    oauth_callback: `${process.env.FRONTEND_URL}/garmin/callback`,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: header },
  })

  if (!res.ok) throw new Error(`Garmin request token failed: ${await res.text()}`)

  const body = await res.text()
  const params = new URLSearchParams(body)
  const token = params.get('oauth_token')!
  const tokenSecret = params.get('oauth_token_secret')!

  return {
    token,
    tokenSecret,
    authorizeUrl: `${GARMIN_AUTHORIZE_URL}?oauth_token=${token}`,
  }
}

export async function exchangeForAccessToken(
  oauthToken: string,
  oauthVerifier: string,
  tokenSecret: string,
): Promise<OAuthTokens> {
  const url = GARMIN_ACCESS_URL
  const header = generateOAuthHeader(
    'POST',
    url,
    { oauth_token: oauthToken, oauth_verifier: oauthVerifier },
    tokenSecret,
  )

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: header },
  })

  if (!res.ok) throw new Error(`Garmin access token failed: ${await res.text()}`)

  const body = await res.text()
  const params = new URLSearchParams(body)

  return {
    accessToken: params.get('oauth_token')!,
    accessTokenSecret: params.get('oauth_token_secret')!,
    userId: params.get('user_id') ?? '',
  }
}

export async function saveGarminTokens(userId: string, tokens: OAuthTokens): Promise<void> {
  await supabaseAdmin.from('user_devices').upsert({
    user_id: userId,
    provider: 'garmin',
    access_token: tokens.accessToken,
    access_token_secret: tokens.accessTokenSecret,
    provider_user_id: tokens.userId,
    connected: true,
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })
}

export async function getGarminTokens(userId: string): Promise<OAuthTokens | null> {
  const { data } = await supabaseAdmin
    .from('user_devices')
    .select('access_token, access_token_secret, provider_user_id')
    .eq('user_id', userId)
    .eq('provider', 'garmin')
    .eq('connected', true)
    .single()

  if (!data) return null

  return {
    accessToken: data.access_token,
    accessTokenSecret: data.access_token_secret,
    userId: data.provider_user_id,
  }
}
