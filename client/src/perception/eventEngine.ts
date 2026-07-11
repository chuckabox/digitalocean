import type { Confidence, SignalFrame } from 'shared';

export type NudgeCandidate = {
  confidence: Confidence;
  evidence: string[];
};

export type EngineState = {
  ewma: number | null;
  varianceEma: number;
  lastNudgeAt: number | null;
  dipStartedAt: number | null;
};

export type EngineOptions = {
  cooldownS?: number;
  dipZ?: number;
  dipHoldS?: number;
  userTalkRatio?: number;
};

const DEFAULTS = {
  cooldownS: 90,
  dipZ: -1.5,
  dipHoldS: 10,
};

export function createEngineState(): EngineState {
  return {
    ewma: null,
    varianceEma: 0.02,
    lastNudgeAt: null,
    dipStartedAt: null,
  };
}

/**
 * Deterministic nudge WHEN — client-owned. Server only phrases the hedge.
 * Engagement z-score vs EWMA, sustained dip + hysteresis + cooldown.
 */
export function considerNudge(
  state: EngineState,
  frame: SignalFrame,
  opts: EngineOptions = {},
): { state: EngineState; candidate: NudgeCandidate | null } {
  const cooldownS = opts.cooldownS ?? DEFAULTS.cooldownS;
  const dipZ = opts.dipZ ?? DEFAULTS.dipZ;
  const dipHoldS = opts.dipHoldS ?? DEFAULTS.dipHoldS;
  const engagement = frame.engagement ?? 0.5;

  let ewma = state.ewma ?? engagement;
  let varianceEma = state.varianceEma;
  if (state.ewma == null) {
    // first frame — seed baseline
  } else {
    const alpha = 0.08;
    const diff = engagement - ewma;
    ewma = ewma + alpha * diff;
    varianceEma = (1 - alpha) * varianceEma + alpha * diff * diff;
  }

  const std = Math.sqrt(Math.max(varianceEma, 1e-4));
  const z = (engagement - ewma) / std;

  let dipStartedAt = state.dipStartedAt;
  if (z <= dipZ) {
    if (dipStartedAt == null) dipStartedAt = frame.t;
  } else if (z > dipZ * 0.5) {
    // hysteresis: clear only when clearly recovered
    dipStartedAt = null;
  }

  let next: EngineState = {
    ewma,
    varianceEma,
    lastNudgeAt: state.lastNudgeAt,
    dipStartedAt,
  };

  const cooled =
    state.lastNudgeAt == null || frame.t - state.lastNudgeAt >= cooldownS;
  const sustained =
    dipStartedAt != null && frame.t - dipStartedAt >= dipHoldS;

  if (!cooled || !sustained) {
    return { state: next, candidate: null };
  }

  const evidence: string[] = [
    `engagement below baseline for ~${Math.round(frame.t - (dipStartedAt ?? frame.t))}s`,
    `engagement ~${Math.round(engagement * 100)}% (z=${z.toFixed(1)})`,
  ];
  if (frame.attention != null) {
    evidence.push(`attention ~${Math.round(frame.attention * 100)}%`);
  }
  if (frame.signals?.gazeAway != null && frame.signals.gazeAway > 0.4) {
    evidence.push(`gazeAway elevated (~${Math.round(frame.signals.gazeAway * 100)}%)`);
  }
  if (opts.userTalkRatio != null && opts.userTalkRatio > 0.7) {
    evidence.push(`you've held the floor ~${Math.round(opts.userTalkRatio * 100)}%`);
  }

  const confidence: Confidence =
    z <= dipZ - 0.5 ? 'high' : frame.confidence === 'high' ? 'high' : 'medium';

  next = { ...next, lastNudgeAt: frame.t, dipStartedAt: null };

  return {
    state: next,
    candidate: {
      confidence,
      evidence: evidence.slice(0, 12),
    },
  };
}

/** URL overrides for venue threshold tuning: ?dipZ=-1.2&dipHold=8&cooldown=60 */
export function engineOptionsFromSearch(search = window.location.search): EngineOptions {
  const q = new URLSearchParams(search);
  const out: EngineOptions = {};
  if (q.has('dipZ')) out.dipZ = Number(q.get('dipZ'));
  if (q.has('dipHold')) out.dipHoldS = Number(q.get('dipHold'));
  if (q.has('cooldown')) out.cooldownS = Number(q.get('cooldown'));
  return out;
}
