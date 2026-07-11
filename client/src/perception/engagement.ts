import type { Confidence, SignalFrame } from 'shared';

export type RawTick = {
  t: number;
  smile: number;
  browRaise: number;
  browFurrow: number;
  eyeOpenness: number;
  gazeAway: number;
  jawOpen: number;
  lean: number; // 0–1 relative to baseline interocular (1 = closer / lean-in)
  facePresent: boolean;
};

export type EngagementState = {
  baselineReady: boolean;
  samples: number;
  meanSmile: number;
  meanGazeAway: number;
  meanBrow: number;
  meanLean: number;
  meanExpress: number;
  lastJaw: number;
  jawVarEma: number;
};

export function createEngagementState(): EngagementState {
  return {
    baselineReady: false,
    samples: 0,
    meanSmile: 0,
    meanGazeAway: 0,
    meanBrow: 0,
    meanLean: 0,
    meanExpress: 0,
    lastJaw: 0,
    jawVarEma: 0,
  };
}

const BASELINE_SAMPLES = 60; // ~5s at 12 Hz, or ~60s at 1 Hz — we call at ~12 Hz

function ema(prev: number, next: number, a = 0.15) {
  return prev * (1 - a) + next * a;
}

export function updateEngagement(
  state: EngagementState,
  tick: RawTick,
): { state: EngagementState; frame: SignalFrame } {
  const express = tick.smile + tick.browRaise + (1 - tick.eyeOpenness) * 0.3;
  const jawDelta = Math.abs(tick.jawOpen - state.lastJaw);
  const jawVarEma = state.samples === 0 ? jawDelta : ema(state.jawVarEma, jawDelta, 0.2);

  let next: EngagementState = {
    ...state,
    samples: state.samples + 1,
    lastJaw: tick.jawOpen,
    jawVarEma,
  };

  if (!next.baselineReady) {
    const n = next.samples;
    next = {
      ...next,
      meanSmile: next.meanSmile + (tick.smile - next.meanSmile) / n,
      meanGazeAway: next.meanGazeAway + (tick.gazeAway - next.meanGazeAway) / n,
      meanBrow: next.meanBrow + (tick.browFurrow - next.meanBrow) / n,
      meanLean: next.meanLean + (tick.lean - next.meanLean) / n,
      meanExpress: next.meanExpress + (express - next.meanExpress) / n,
      baselineReady: n >= BASELINE_SAMPLES,
    };
  }

  const dSmile = tick.smile - next.meanSmile;
  const dGaze = tick.gazeAway - next.meanGazeAway;
  const dLean = tick.lean - next.meanLean;
  const dExpress = express - next.meanExpress;

  // Higher engagement: looking at camera, smiling/leaning relative to baseline
  const engagement = clamp01(
    0.55 +
      dSmile * 0.35 +
      dLean * 0.25 +
      dExpress * 0.2 -
      dGaze * 0.45 -
      tick.gazeAway * 0.15,
  );
  const attention = clamp01(1 - tick.gazeAway * 0.85 - Math.max(0, dGaze) * 0.3);
  const valence = clamp(-1, 1, dSmile * 1.4 - (tick.browFurrow - next.meanBrow) * 0.8);

  const confidence = scoreConfidence(tick, next, engagement);

  const frame: SignalFrame = {
    t: tick.t,
    engagement,
    attention,
    valence,
    signals: {
      smile: tick.smile,
      browRaise: tick.browRaise,
      browFurrow: tick.browFurrow,
      eyeOpenness: tick.eyeOpenness,
      gazeAway: tick.gazeAway,
      lean: tick.lean,
      jawOpen: tick.jawOpen,
      talking: clamp01(jawVarEma * 8),
    },
    confidence,
  };

  return { state: next, frame };
}

function scoreConfidence(tick: RawTick, state: EngagementState, engagement: number): Confidence {
  if (!tick.facePresent) return 'low';
  if (!state.baselineReady) return 'low';
  const extreme = engagement < 0.35 || engagement > 0.85;
  if (extreme && tick.gazeAway > 0.5) return 'high';
  if (state.samples > BASELINE_SAMPLES * 2) return 'medium';
  return 'low';
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function clamp(lo: number, hi: number, n: number) {
  return Math.max(lo, Math.min(hi, n));
}
