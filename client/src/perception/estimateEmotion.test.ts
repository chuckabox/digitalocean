import { describe, expect, it } from 'vitest';
import { estimateEmotion } from './estimateEmotion';

const sum = (e: Record<string, number>) =>
  Object.values(e).reduce((a, b) => a + b, 0);

describe('estimateEmotion', () => {
  it('leans happy when smiling with low furrow', () => {
    const e = estimateEmotion({
      smile: 0.7,
      frown: 0.02,
      browRaise: 0.1,
      browFurrow: 0.05,
      eyeOpenness: 0.9,
      gazeAway: 0.05,
      jawOpen: 0.05,
    });
    expect(e.happy).toBeGreaterThan(e.tense);
    expect(e.happy).toBeGreaterThan(e.sad);
    expect(sum(e)).toBeCloseTo(1, 5);
  });

  it('leans tense when furrowed and jaw open', () => {
    const e = estimateEmotion({
      smile: 0.05,
      frown: 0.05,
      browRaise: 0.1,
      browFurrow: 0.7,
      eyeOpenness: 0.7,
      gazeAway: 0.2,
      jawOpen: 0.4,
    });
    expect(e.tense).toBeGreaterThan(e.happy);
  });

  it('leans sad when frowning with low smile', () => {
    const e = estimateEmotion({
      smile: 0.02,
      frown: 0.75,
      browRaise: 0.05,
      browFurrow: 0.25,
      eyeOpenness: 0.75,
      gazeAway: 0.15,
      jawOpen: 0.05,
    });
    expect(e.sad).toBeGreaterThan(e.happy);
    expect(e.sad).toBeGreaterThan(e.surprised);
  });

  it('leans surprised when brows up and eyes open', () => {
    const e = estimateEmotion({
      smile: 0.1,
      frown: 0.02,
      browRaise: 0.85,
      browFurrow: 0.05,
      eyeOpenness: 0.95,
      gazeAway: 0.05,
      jawOpen: 0.35,
    });
    expect(e.surprised).toBeGreaterThan(e.calm);
    expect(e.surprised).toBeGreaterThan(e.sad);
  });
});
