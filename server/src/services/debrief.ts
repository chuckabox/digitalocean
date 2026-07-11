import { analyzeSession, type DebriefInput, type DebriefRequest, type SignalFrame } from 'shared';
import { stream, type ModelTier } from '../clients/gradient.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { getFrames } from '../repositories/frames.js';
import { cannedDebrief } from './fallbacks.js';
import { computeMetrics } from './metrics.js';

function normalizeDebriefRequest(req: DebriefRequest): DebriefInput {
  return { ...req, transcript: req.transcript ?? [] };
}

const DEBRIEF_SYSTEM = `You write post-conversation debriefs for Wavelength, a consented social co-pilot
that reads two channels: the *face* (voluntary, observable expression) and the *body*
(involuntary arousal — heart rate estimated from the webcam via rPPG, experimental).

Rules:
- Very friendly, conversational, warm, direct, specific, kind. Like a supportive friend. Suggest, never diagnose.
- Soft emotion labels (happy/sad/tense/surprised/uncertain/calm) are allowed when
  grounded in the provided facts — always hedge ("may look sad", "reads as tense").
  Still cite observable SIGNAL SHIFTS and their timing.
- Hedge interpretations ("may", "might", "could", "one reading is").
- Treat the "body" (arousal / heart rate) reads as EXPERIMENTAL and confidence-limited.
  Never claim they reveal a hidden truth or that someone is lying — only that a signal moved.
- Ground every claim in the provided facts. NEVER invent a timestamp, number, or quote.
- Include specific references to what was said (with quotes) and when (with timestamps).

Structure (prose, not a JSON dump):
1) THE HEADLINE — if a face/body divergence ("The Tell") is provided, lead with it: the
   single most interesting moment where the body moved but the face stayed steady. Name the
   time and what each channel did. If there is no Tell, lead with the clearest engagement shift.
2) 2–3 EVENT-ANCHORED beats — each tied to a specific t=…s moment from the facts, and where
   a transcript line is given, connect the shift to what was exactly said ("At 1:24 you mentioned...").
3) 1–2 concrete, kind things to try next time, tied to a specific moment.

Keep it tight (~180–240 words). Cite t=…s or mm:ss timestamps. No headings-as-labels; flowing paragraphs.`;

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

function buildPrompt(req: DebriefInput, factLines: string[], tellLine: string | null): string {
  const parts: string[] = [];
  if (req.context) parts.push(`Session context: ${req.context}`);
  if (tellLine) {
    parts.push('THE TELL (lead with this — the biggest face/body divergence):');
    parts.push(`- ${tellLine}`);
  }
  parts.push('Grounded facts (computed in code — treat as true; do not add any others):');
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
  const analysis = analyzeSession(frames, req.transcript);
  const tier: ModelTier = req.tier ?? 'smart';
  // Event-based facts (moments, arousal, The Tell) lead; speech-stat facts fill in.
  const factLines = [...analysis.factLines, ...metrics.factLines];
  const tellLine = analysis.theTell
    ? `Near t=${analysis.theTell.t}s, ${analysis.theTell.bodyDesc}, while the ${analysis.theTell.faceDesc}.`
    : null;
  const prompt = buildPrompt(req, factLines, tellLine);

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
