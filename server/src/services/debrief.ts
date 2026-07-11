import type { DebriefInput, DebriefRequest, SignalFrame } from 'shared';
import { stream, type ModelTier } from '../clients/gradient.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { getFrames } from '../repositories/frames.js';
import { cannedDebrief } from './fallbacks.js';
import { computeMetrics } from './metrics.js';

function normalizeDebriefRequest(req: DebriefRequest): DebriefInput {
  return { ...req, transcript: req.transcript ?? [] };
}

const DEBRIEF_SYSTEM = `You write post-conversation debriefs for Wavelength, a consented social co-pilot.
Rules:
- Warm, direct, kind. Suggest never diagnose.
- Never label emotions (no happy/sad/angry/anxious/etc.). Stick to observable signals and speech stats.
- Hedge interpretations ("may", "might", "could", "often means").
- Structure:
  1) 2–3 sentences on what seemed to go okay
  2) 2–3 timestamped moments grounded ONLY in the provided facts (cite t=…s)
  3) 1–2 concrete things to try next time
- Do not invent timestamps or metrics that are not in the facts.
- Plain prose paragraphs; no JSON; no bullet-only dumps unless brief lists help clarity.`;

function framesFromRows(
  rows: Array<{
    t: number;
    engagement: number | null;
    valence: number | null;
    attention: number | null;
    signals: Record<string, number> | null;
    confidence: 'low' | 'medium' | 'high' | null;
  }>,
): SignalFrame[] {
  return rows.map((r) => ({
    t: r.t,
    engagement: r.engagement ?? undefined,
    valence: r.valence ?? undefined,
    attention: r.attention ?? undefined,
    signals: r.signals ?? undefined,
    confidence: r.confidence ?? undefined,
  }));
}

async function resolveFrames(req: DebriefRequest): Promise<SignalFrame[]> {
  if (req.frames && req.frames.length > 0) return req.frames;
  if (req.sessionId) {
    const rows = await getFrames(req.sessionId);
    return framesFromRows(rows);
  }
  return [];
}

function buildPrompt(req: DebriefInput, factLines: string[]): string {
  const parts: string[] = [];
  if (req.context) parts.push(`Session context: ${req.context}`);
  parts.push('Grounded facts (computed in code — treat as true):');
  parts.push(...factLines.map((l) => `- ${l}`));

  if (req.transcript.length > 0) {
    parts.push('Transcript (speaker @ t seconds):');
    const clip = req.transcript.slice(0, 80);
    for (const turn of clip) {
      parts.push(`[${turn.t.toFixed(0)}s] ${turn.speaker}: ${turn.text}`);
    }
    if (req.transcript.length > 80) {
      parts.push(`… (${req.transcript.length - 80} more turns omitted)`);
    }
  }

  parts.push('Write the debrief now.');
  return parts.join('\n');
}

/**
 * Yield debrief text deltas. On missing key / immediate upstream failure,
 * yields the full canned debrief as a single chunk instead of throwing.
 */
export async function* streamDebrief(raw: DebriefRequest): AsyncGenerator<string> {
  const req = normalizeDebriefRequest(raw);
  const frames = await resolveFrames(req);
  const metrics = computeMetrics(frames, req.transcript);
  const tier: ModelTier = req.tier ?? 'smart';
  const prompt = buildPrompt(req, metrics.factLines);

  try {
    for await (const delta of stream({
      tier,
      system: DEBRIEF_SYSTEM,
      prompt,
      maxTokens: 1024,
    })) {
      yield delta;
    }
  } catch (err) {
    if (err instanceof AppError && err.code === 'upstream_error') {
      logger.warn(
        { code: err.code, message: err.message, tier },
        'Debrief falling back to canned copy',
      );
      yield cannedDebrief(metrics, req.context);
      return;
    }
    throw err;
  }
}
