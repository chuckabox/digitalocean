/** Pure blendshape / matrix → derived signal helpers (no DOM). */

export type BlendshapeMap = Record<string, number>;

export function blendshapeMap(
  categories: Array<{ categoryName?: string; displayName?: string; score: number }> | undefined,
): BlendshapeMap {
  const out: BlendshapeMap = {};
  if (!categories) return out;
  for (const c of categories) {
    const name = c.categoryName || c.displayName;
    if (name) out[name] = c.score;
  }
  return out;
}

function avg(a: number, b: number) {
  return (a + b) / 2;
}

export function deriveRawSignals(
  shapes: BlendshapeMap,
  matrix: number[] | undefined,
): {
  smile: number;
  frown: number;
  browRaise: number;
  browFurrow: number;
  eyeOpenness: number;
  gazeAway: number;
  jawOpen: number;
  yaw: number;
  pitch: number;
} {
  const smile = avg(shapes['mouthSmileLeft'] ?? 0, shapes['mouthSmileRight'] ?? 0);
  const frown = avg(shapes['mouthFrownLeft'] ?? 0, shapes['mouthFrownRight'] ?? 0);
  const browRaise =
    (shapes['browInnerUp'] ?? 0) +
    avg(shapes['browOuterUpLeft'] ?? 0, shapes['browOuterUpRight'] ?? 0);
  const browFurrow = avg(shapes['browDownLeft'] ?? 0, shapes['browDownRight'] ?? 0);
  const eyeOpenness =
    1 - avg(shapes['eyeBlinkLeft'] ?? 0, shapes['eyeBlinkRight'] ?? 0);
  const jawOpen = shapes['jawOpen'] ?? 0;

  const { yaw, pitch } = matrixToYawPitch(matrix);
  const gazeFromEyes =
    Math.abs((shapes['eyeLookOutLeft'] ?? 0) - (shapes['eyeLookInLeft'] ?? 0)) +
    Math.abs((shapes['eyeLookOutRight'] ?? 0) - (shapes['eyeLookInRight'] ?? 0));
  const gazeAwayHead = Math.abs(yaw) > 0.35 || Math.abs(pitch) > 0.28 ? 1 : 0;
  const gazeAway = Math.min(1, Math.max(gazeAwayHead, gazeFromEyes * 0.6));

  return { smile, frown, browRaise, browFurrow, eyeOpenness, gazeAway, jawOpen, yaw, pitch };
}

/** Extract approximate yaw/pitch (radians) from a column-major 4×4 matrix. */
export function matrixToYawPitch(matrix: number[] | undefined): { yaw: number; pitch: number } {
  if (!matrix || matrix.length < 16) return { yaw: 0, pitch: 0 };
  // Column-major: forward vector ~ (m[8], m[9], m[10])
  const r20 = matrix[8]!;
  const r21 = matrix[9]!;
  const r22 = matrix[10]!;
  const pitch = Math.asin(Math.max(-1, Math.min(1, -r21)));
  const yaw = Math.atan2(r20, r22);
  return { yaw, pitch };
}
