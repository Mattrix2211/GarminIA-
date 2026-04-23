import crypto from 'crypto'

const CLIENT_ID = process.env.GARMIN_CLIENT_ID!
const CLIENT_SECRET = process.env.GARMIN_CLIENT_SECRET!
const BASE = 'https://apis.garmin.com'

export interface GarminDailyWellness {
  date: string
  hrv_ms: number | null
  body_battery_max: number | null
  body_battery_min: number | null
  sleep_score: number | null
  sleep_duration_min: number | null
  sleep_deep_min: number | null
  sleep_rem_min: number | null
  sleep_light_min: number | null
  sleep_awake_min: number | null
  resting_hr: number | null
  stress_avg: number | null
  acute_load: number | null
  chronic_load: number | null
  recovery_time_hours: number | null
  training_status: string | null
}

function buildAuthHeader(
  method: string,
  url: string,
  accessToken: string,
  accessTokenSecret: string,
): string {
  const params: Record<string, string> = {
    oauth_consumer_key: CLIENT_ID,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const sorted = Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')

  const base = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sorted)].join('&')
  const key = `${encodeURIComponent(CLIENT_SECRET)}&${encodeURIComponent(accessTokenSecret)}`
  const signature = crypto.createHmac('sha1', key).update(base).digest('base64')

  params.oauth_signature = signature
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')
}

async function garminFetch<T>(
  path: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<T> {
  const url = `${BASE}${path}`
  const header = buildAuthHeader('GET', url, accessToken, accessTokenSecret)
  const res = await fetch(url, { headers: { Authorization: header } })
  if (!res.ok) throw new Error(`Garmin API ${path}: ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

export async function fetchDailyWellness(
  accessToken: string,
  accessTokenSecret: string,
  date: string,
): Promise<GarminDailyWellness> {
  const [hrv, bb, sleep, stress] = await Promise.allSettled([
    garminFetch<{ hrvSummaries?: { weeklyAvg: number }[] }>(
      `/wellness-api/rest/hrv?uploadStartTimeInSeconds=${toEpoch(date)}&uploadEndTimeInSeconds=${toEpoch(date) + 86400}`,
      accessToken, accessTokenSecret,
    ),
    garminFetch<{ bodyBatteryFeedbackList?: { bodyBatteryLevel: number }[] }>(
      `/wellness-api/rest/bodyBattery?startDate=${date}&endDate=${date}`,
      accessToken, accessTokenSecret,
    ),
    garminFetch<{ dailySleepDTO?: {
      sleepScores?: { overall: { value: number } }
      sleepTimeSeconds?: number
      deepSleepSeconds?: number
      remSleepSeconds?: number
      lightSleepSeconds?: number
      awakeSleepSeconds?: number
      restingHeartRate?: number
    } }>(
      `/wellness-api/rest/sleep?startDate=${date}&endDate=${date}`,
      accessToken, accessTokenSecret,
    ),
    garminFetch<{ stressValuesArray?: [number, number][]; allDayStress?: { avgStressLevel: number } }>(
      `/wellness-api/rest/dailies?startDate=${date}&endDate=${date}`,
      accessToken, accessTokenSecret,
    ),
    garminFetch<{ metricDescriptors?: object[] }>(
      `/training-api/rest/trainingReadiness?startDate=${date}`,
      accessToken, accessTokenSecret,
    ),
  ])

  const hrvData = hrv.status === 'fulfilled' ? hrv.value : null
  const bbData = bb.status === 'fulfilled' ? bb.value : null
  const sleepData = sleep.status === 'fulfilled' ? sleep.value?.dailySleepDTO : null
  const stressData = stress.status === 'fulfilled' ? stress.value : null

  const bbLevels = bbData?.bodyBatteryFeedbackList?.map(x => x.bodyBatteryLevel) ?? []

  return {
    date,
    hrv_ms: hrvData?.hrvSummaries?.[0]?.weeklyAvg ?? null,
    body_battery_max: bbLevels.length ? Math.max(...bbLevels) : null,
    body_battery_min: bbLevels.length ? Math.min(...bbLevels) : null,
    sleep_score: sleepData?.sleepScores?.overall?.value ?? null,
    sleep_duration_min: sleepData?.sleepTimeSeconds ? Math.round(sleepData.sleepTimeSeconds / 60) : null,
    sleep_deep_min: sleepData?.deepSleepSeconds ? Math.round(sleepData.deepSleepSeconds / 60) : null,
    sleep_rem_min: sleepData?.remSleepSeconds ? Math.round(sleepData.remSleepSeconds / 60) : null,
    sleep_light_min: sleepData?.lightSleepSeconds ? Math.round(sleepData.lightSleepSeconds / 60) : null,
    sleep_awake_min: sleepData?.awakeSleepSeconds ? Math.round(sleepData.awakeSleepSeconds / 60) : null,
    resting_hr: sleepData?.restingHeartRate ?? null,
    stress_avg: stressData?.allDayStress?.avgStressLevel ?? null,
    acute_load: null,
    chronic_load: null,
    recovery_time_hours: null,
    training_status: null,
  }
}

export async function fetchActivities(
  accessToken: string,
  accessTokenSecret: string,
  limit = 10,
): Promise<unknown[]> {
  return garminFetch<unknown[]>(
    `/activitylist-service/activities/search/activities?limit=${limit}`,
    accessToken, accessTokenSecret,
  )
}

function toEpoch(date: string): number {
  return Math.floor(new Date(date).getTime() / 1000)
}
