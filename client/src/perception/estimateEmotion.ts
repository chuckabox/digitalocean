/** Soft emotion-state probabilities from blendshape-derived cues — experimental. */

export type EmotionProbs = {
  calm: number;
  happy: number;
  sad: number;
  tense: number;
  surprised: number;
  uncertain: number;
};

export type EmotionInputs = {
  smile: number;
  frown: number;
  browRaise: number;
  browFurrow: number;
  eyeOpenness: number;
  gazeAway: number;
  jawOpen: number;
};

const EMOTION_KEYS = [
  'calm',
  'happy',
  'sad',
  'tense',
  'surprised',
  'uncertain',
] as const satisfies ReadonlyArray<keyof EmotionProbs>;

function softmax(logits: EmotionProbs): EmotionProbs {
  const max = Math.max(...EMOTION_KEYS.map((k) => logits[k]));
  const exps = EMOTION_KEYS.map((k) => Math.exp(logits[k] - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  const out = { calm: 0, happy: 0, sad: 0, tense: 0, surprised: 0, uncertain: 0 };
  EMOTION_KEYS.forEach((k, i) => {
    out[k] = exps[i]! / sum;
  });
  return out;
}

/**
 * Heuristic 6-way emotion distribution from observable facial descriptors.
 * Hedged by design: use as relative probabilities, never a hard verdict.
 */
export function estimateEmotion(raw: EmotionInputs): EmotionProbs {
  const happy =
    raw.smile * 2.6 +
    raw.browRaise * 0.15 -
    raw.frown * 1.4 -
    raw.browFurrow * 0.9 -
    raw.gazeAway * 0.2;

  const sad =
    raw.frown * 2.4 +
    (1 - raw.smile) * 0.55 +
    raw.browFurrow * 0.35 +
    (1 - raw.eyeOpenness) * 0.25 -
    raw.smile * 1.6 -
    raw.browRaise * 0.4;

  const tense =
    raw.browFurrow * 2.2 +
    raw.jawOpen * 0.45 +
    (1 - raw.eyeOpenness) * 0.35 -
    raw.smile * 0.7 -
    raw.frown * 0.2;

  const surprised =
    raw.browRaise * 2.1 +
    raw.eyeOpenness * 0.9 +
    raw.jawOpen * 0.55 -
    raw.smile * 0.35 -
    raw.browFurrow * 0.8 -
    raw.frown * 0.5;

  const uncertain =
    raw.browRaise * 1.2 +
    raw.gazeAway * 1.1 +
    (1 - raw.eyeOpenness) * 0.35 -
    raw.smile * 0.3 -
    raw.frown * 0.15;

  const calm =
    1.5 -
    Math.abs(raw.smile - 0.1) * 1.1 -
    raw.frown * 1.0 -
    raw.browFurrow * 1.1 -
    raw.browRaise * 0.45 -
    raw.gazeAway * 0.55 -
    raw.jawOpen * 0.35;

  return softmax({ calm, happy, sad, tense, surprised, uncertain });
}
