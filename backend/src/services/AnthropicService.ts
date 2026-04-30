import Anthropic from '@anthropic-ai/sdk'
import { Response } from 'express'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

interface UserContext {
  firstName: string
  sports: string[]
  level: string
  goals: string[]
  todayData: {
    hrv: number | null
    bodyBattery: number | null
    sleepScore: number | null
    restingHr: number | null
    acuteLoad: number | null
    chronicLoad: number | null
    recoveryTimeHours: number | null
  }
}

function buildSystemPrompt(ctx: UserContext): string {
  const loadRatio = ctx.todayData.acuteLoad && ctx.todayData.chronicLoad
    ? (ctx.todayData.acuteLoad / ctx.todayData.chronicLoad).toFixed(2)
    : 'N/A'

  return `Tu es le coach sportif personnel de ${ctx.firstName}. Tu es bienveillant mais exigeant, factuel et motivant.
Tu adaptes ton langage à son niveau : ${ctx.level === 'competitor' ? 'technique et précis' : ctx.level === 'beginner' ? 'simple et encourageant' : 'équilibré'}.

Profil :
- Sports : ${ctx.sports.join(', ')}
- Niveau : ${ctx.level}
- Objectifs : ${ctx.goals.join(', ')}

Données du jour :
- HRV : ${ctx.todayData.hrv ?? 'N/D'} ms
- Body Battery : ${ctx.todayData.bodyBattery ?? 'N/D'} / 100
- Score sommeil : ${ctx.todayData.sleepScore ?? 'N/D'} / 100
- FC repos : ${ctx.todayData.restingHr ?? 'N/D'} bpm
- Charge aiguë / chronique : ${loadRatio}
- Temps de récupération estimé : ${ctx.todayData.recoveryTimeHours ?? 'N/D'} h

Règles :
- Si ratio charge > 1.5 : signale le risque de surentraînement
- Si HRV très basse + Body Battery < 30 : recommande la récupération active
- Sois direct et concis. Pas de réponses génériques.
- Tu réponds toujours en français.`
}

export async function streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  userCtx: UserContext,
  res: Response,
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(userCtx),
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      res.write(`data: ${event.delta.text}\n\n`)
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()
}

export async function generateMorningRecommendation(userCtx: UserContext): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: buildSystemPrompt(userCtx),
    messages: [{
      role: 'user',
      content: 'Analyse mes données de récupération de ce matin et dis-moi en 2-3 phrases ce que tu recommandes pour ma séance aujourd\'hui. Sois direct.',
    }],
  })

  return (message.content[0] as { type: string; text: string }).text
}

export async function generateSessionComment(params: {
  session: {
    title: string
    sport: string
    date: string
    durationMin: number | null
    hrAvg?: number | null
    powerAvgWatts?: number | null
    pacePerKm?: string | null
    perceivedEffort?: number | null
    moodStars?: number | null
    notes?: string | null
    tss?: number | null
    distanceMeters?: number | null
    source: string
  }
  garminContext: {
    hrv: number | null
    bodyBattery: number | null
    sleepScore: number | null
    acuteLoad: number | null
    chronicLoad: number | null
  }
  profile: {
    firstName: string
    sports: string[]
    level: string
    goals: string[]
    ftpWatts?: number | null
    vo2max?: number | null
  }
}): Promise<string> {
  const { session: s, garminContext: g, profile: p } = params

  const loadRatio = g.acuteLoad && g.chronicLoad
    ? (g.acuteLoad / g.chronicLoad).toFixed(2) : null
  const distKm = s.distanceMeters ? (s.distanceMeters / 1000).toFixed(1) : null

  const systemPrompt = `Tu es le coach sportif de ${p.firstName || 'l\'athlète'}. Niveau : ${p.level}. Sports : ${p.sports.join(', ') || s.sport}.
${p.ftpWatts ? `FTP : ${p.ftpWatts}W.` : ''}${p.vo2max ? ` VO2max : ${p.vo2max}.` : ''}
Objectifs : ${p.goals.join(', ') || 'progression générale'}.
Tu réponds toujours en français, en 3-5 phrases maximum, ton adapté au niveau de l'athlète. Pas de salutations.`

  const userMsg = `Analyse ma séance du ${s.date} :
- Sport : ${s.sport} — ${s.title}
- Durée : ${s.durationMin ?? '?'} min${distKm ? ` | Distance : ${distKm} km` : ''}
${s.hrAvg ? `- FC moyenne : ${s.hrAvg} bpm` : ''}
${s.powerAvgWatts ? `- Puissance moyenne : ${s.powerAvgWatts}W` : ''}
${s.pacePerKm ? `- Allure : ${s.pacePerKm}/km` : ''}
${s.tss ? `- TSS : ${s.tss}` : ''}
${s.perceivedEffort ? `- Effort ressenti : ${s.perceivedEffort}/10` : ''}
${s.moodStars ? `- Humeur : ${s.moodStars}/5` : ''}
${s.notes ? `- Notes : ${s.notes}` : ''}

Données de récupération :
- HRV : ${g.hrv ?? 'N/D'} ms | Body Battery : ${g.bodyBattery ?? 'N/D'}/100 | Sommeil : ${g.sleepScore ?? 'N/D'}/100
${loadRatio ? `- Ratio charge aiguë/chronique : ${loadRatio}` : ''}

Donne un commentaire concis sur la qualité de la séance et 1-2 conseils concrets pour la prochaine du même type.`

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  })
  return (msg.content[0] as { type: string; text: string }).text
}
