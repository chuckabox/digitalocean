import type { SignalFrame, TranscriptTurn } from 'shared';

/** Deterministic session facts — computed in code, never by the LLM. */

export interface SessionMetrics {
  frameCount: number;
  durationSec: number;
  engagementMean: number | null;
  engagementMin: number | null;
  engagementMinAt: number | null;
  attentionMean: number | null;
  /** Local minima of engagement (t + value), up to 3. */
  engagementDips: Array<{ t: number; engagement: number }>;
  userTalkSec: number;
  partnerTalkSec: number;
  userTalkRatio: number | null;
  userQuestionCount: number;
  partnerQuestionCount: number;
  longestUserMonologueSec: number;
  /** Human-readable lines for prompt injection. */
  factLines: string[];
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function isQuestion(text: string): boolean {
  return /\?/.test(text) || /^(who|what|when|where|why|how|do|does|did|are|is|can|could|would|will)\b/i.test(text.trim());
}

/**
 * Compute grounded metrics from frames + transcript. Pure — no I/O.
 * Never labels emotions; only describes measurable signals and speech stats.
 */
export function computeMetrics(
  frames: SignalFrame[],
  transcript: TranscriptTurn[] = [],
): SessionMetrics {
  const engagements = frames
    .map((f) => f.engagement)
    .filter((v): v is number => typeof v === 'number');
  const attentions = frames
    .map((f) => f.attention)
    .filter((v): v is number => typeof v === 'number');

  const durationSec =
    frames.length > 0
      ? Math.max(...frames.map((f) => f.t), ...transcript.map((t) => t.t), 0)
      : transcript.length > 0
        ? Math.max(...transcript.map((t) => t.t), 0)
        : 0;

  let engagementMin: number | null = null;
  let engagementMinAt: number | null = null;
  for (const f of frames) {
    if (typeof f.engagement !== 'number') continue;
    if (engagementMin === null || f.engagement < engagementMin) {
      engagementMin = f.engagement;
      engagementMinAt = f.t;
    }
  }

  // Simple local dips: engagement lower than both neighbors by ≥0.08
  const dips: Array<{ t: number; engagement: number }> = [];
  const withEng = frames.filter((f): f is SignalFrame & { engagement: number } => typeof f.engagement === 'number');
  for (let i = 1; i < withEng.length - 1; i++) {
    const prev = withEng[i - 1]!;
    const cur = withEng[i]!;
    const next = withEng[i + 1]!;
    if (cur.engagement < prev.engagement - 0.08 && cur.engagement < next.engagement - 0.08) {
      dips.push({ t: cur.t, engagement: cur.engagement });
    }
  }
  dips.sort((a, b) => a.engagement - b.engagement);
  const engagementDips = dips.slice(0, 3);

  let userTalkSec = 0;
  let partnerTalkSec = 0;
  let userQuestionCount = 0;
  let partnerQuestionCount = 0;
  let longestUserMonologueSec = 0;
  let monologueStart: number | null = null;
  let lastUserT: number | null = null;

  const sorted = [...transcript].sort((a, b) => a.t - b.t);
  for (let i = 0; i < sorted.length; i++) {
    const turn = sorted[i]!;
    const nextT = sorted[i + 1]?.t ?? turn.t + Math.max(2, turn.text.split(/\s+/).length * 0.4);
    const dur = Math.max(0, nextT - turn.t);
    if (turn.speaker === 'user') {
      userTalkSec += dur;
      if (isQuestion(turn.text)) userQuestionCount += 1;
      if (monologueStart === null) monologueStart = turn.t;
      lastUserT = nextT;
    } else {
      partnerTalkSec += dur;
      if (isQuestion(turn.text)) partnerQuestionCount += 1;
      if (monologueStart !== null && lastUserT !== null) {
        longestUserMonologueSec = Math.max(longestUserMonologueSec, lastUserT - monologueStart);
      }
      monologueStart = null;
      lastUserT = null;
    }
  }
  if (monologueStart !== null && lastUserT !== null) {
    longestUserMonologueSec = Math.max(longestUserMonologueSec, lastUserT - monologueStart);
  }

  const talkTotal = userTalkSec + partnerTalkSec;
  const userTalkRatio = talkTotal > 0 ? userTalkSec / talkTotal : null;
  const engagementMean = mean(engagements);
  const attentionMean = mean(attentions);

  const factLines: string[] = [];
  factLines.push(`Duration ≈ ${durationSec.toFixed(0)}s; ${frames.length} signal frame(s).`);
  if (engagementMean !== null) {
    factLines.push(`Mean engagement ${(engagementMean * 100).toFixed(0)}% (0–100 scale).`);
  }
  if (engagementMin !== null && engagementMinAt !== null) {
    factLines.push(
      `Lowest engagement ${(engagementMin * 100).toFixed(0)}% at t=${engagementMinAt.toFixed(0)}s.`,
    );
  }
  for (const d of engagementDips) {
    factLines.push(`Engagement dip to ${(d.engagement * 100).toFixed(0)}% near t=${d.t.toFixed(0)}s.`);
  }
  if (attentionMean !== null) {
    factLines.push(`Mean attention ${(attentionMean * 100).toFixed(0)}%.`);
  }
  if (userTalkRatio !== null) {
    factLines.push(
      `Talk balance: user ${(userTalkRatio * 100).toFixed(0)}% / partner ${((1 - userTalkRatio) * 100).toFixed(0)}% of speaking time.`,
    );
  }
  if (longestUserMonologueSec > 0) {
    factLines.push(`Longest user monologue ≈ ${longestUserMonologueSec.toFixed(0)}s.`);
  }
  factLines.push(
    `Questions asked — user: ${userQuestionCount}, partner: ${partnerQuestionCount}.`,
  );

  return {
    frameCount: frames.length,
    durationSec,
    engagementMean,
    engagementMin,
    engagementMinAt,
    attentionMean,
    engagementDips,
    userTalkSec,
    partnerTalkSec,
    userTalkRatio,
    userQuestionCount,
    partnerQuestionCount,
    longestUserMonologueSec,
    factLines,
  };
}
