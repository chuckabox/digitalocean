import type { Confidence, NudgeResponse } from 'shared';
import type { SessionMetrics } from './metrics.js';

/** Venue-safe canned copy when Gradient is down or misconfigured. */

const NUDGE_BY_CONFIDENCE: Record<Confidence, string[]> = {
  low: [
    'Things look mostly steady — maybe check in with a short question when it feels natural?',
    'Soft signal only — you could pause briefly and invite their take, if it fits.',
  ],
  medium: [
    'They may be drifting a bit — maybe ask a question or hand them the floor?',
    'Engagement looks softer than earlier — a brief check-in question could help.',
  ],
  high: [
    'Partner attention looks low right now — consider a short question or a lighter topic shift.',
    'This might be a good moment to pause and ask what they think.',
  ],
};

export function cannedNudge(confidence: Confidence, evidence: string[]): NudgeResponse {
  const options = NUDGE_BY_CONFIDENCE[confidence];
  const text = options[evidence.length % options.length]!;
  return { text, confidence, evidence };
}

export function cannedDebrief(metrics: SessionMetrics, context?: string): string {
  const ctx = context?.trim() ? ` Context: ${context.trim()}.` : '';
  const dips =
    metrics.engagementDips.length > 0
      ? metrics.engagementDips
          .map((d) => `around ${d.t.toFixed(0)}s (engagement ~${(d.engagement * 100).toFixed(0)}%)`)
          .join('; ')
      : 'none strongly flagged';

  const talk =
    metrics.userTalkRatio !== null
      ? `You held about ${(metrics.userTalkRatio * 100).toFixed(0)}% of the speaking time`
      : 'Talk balance was inconclusive';

  return [
    `Here's a quick offline debrief (Gradient unavailable).${ctx}`,
    '',
    'What seemed to go okay:',
    `- You stayed in the conversation for ~${metrics.durationSec.toFixed(0)}s with ${metrics.frameCount} signal samples.`,
    `- ${talk}; you asked ${metrics.userQuestionCount} question(s).`,
    '',
    'Moments worth a second look:',
    `- Engagement dips: ${dips}.`,
    metrics.longestUserMonologueSec > 20
      ? `- Longest stretch you held the floor ≈ ${metrics.longestUserMonologueSec.toFixed(0)}s — sometimes a shorter beat + a question lands better.`
      : `- No long monologue stood out from the transcript stats.`,
    '',
    'Something to try next time:',
    '- Pick one dip timestamp, replay what was said then, and practice a one-sentence check-in question.',
    '',
    'These are hedged observations from measurable signals and speech stats — not a read of anyone\'s feelings.',
  ].join('\n');
}
