import {
  NudgeLlmSchema,
  type NudgeRequest,
  type NudgeResponse,
} from 'shared';
import { structured } from '../clients/gradient.js';
import { AppError } from '../errors.js';
import { cannedNudge } from './fallbacks.js';

const NUDGE_SYSTEM = `You phrase discreet live nudges for Wavelength, a consented social co-pilot.
Rules:
- Suggest, never diagnose. Hedge always ("may", "might", "could", "looks like").
- Never name emotions (no happy/sad/angry/anxious/bored/etc.). Describe observable cues only.
- One short sentence, actionable, under 160 characters when possible.
- Ground the nudge in the provided evidence strings; do not invent new evidence.
- Return confidence as low|medium|high reflecting how strong the evidence looks (you may keep the client's level).`;

function buildPrompt(req: NudgeRequest): string {
  const lines = [
    req.context ? `Conversation context: ${req.context}` : null,
    `Client confidence: ${req.confidence}`,
    'Evidence:',
    ...req.evidence.map((e) => `- ${e}`),
  ].filter(Boolean) as string[];

  if (req.recentFrames && req.recentFrames.length > 0) {
    const last = req.recentFrames.slice(-5);
    lines.push('Recent signal frames (t, engagement, attention):');
    for (const f of last) {
      lines.push(
        `- t=${f.t.toFixed(1)} eng=${f.engagement ?? 'n/a'} att=${f.attention ?? 'n/a'}`,
      );
    }
  }

  lines.push('Emit one hedged nudge.');
  return lines.join('\n');
}

/** Phrase a live nudge via forced tool-call; fall back to canned copy on upstream failure. */
export async function phraseNudge(req: NudgeRequest): Promise<NudgeResponse> {
  try {
    const llm = await structured(NudgeLlmSchema, {
      tier: 'fast',
      toolName: 'emit_nudge',
      toolDescription: 'Emit a single hedged, actionable nudge with a confidence level.',
      system: NUDGE_SYSTEM,
      prompt: buildPrompt(req),
      maxTokens: 200,
    });
    return {
      text: llm.text,
      confidence: llm.confidence,
      evidence: req.evidence,
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'upstream_error') {
      return cannedNudge(req.confidence, req.evidence);
    }
    throw err;
  }
}
