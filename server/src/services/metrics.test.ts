import { describe, it, expect } from 'vitest';
import { computeMetrics } from './metrics.js';

describe('computeMetrics', () => {
  it('computes engagement mean/min and dips', () => {
    const m = computeMetrics([
      { t: 0, engagement: 0.8, attention: 0.7 },
      { t: 10, engagement: 0.75, attention: 0.6 },
      { t: 20, engagement: 0.4, attention: 0.5 },
      { t: 30, engagement: 0.7, attention: 0.65 },
    ]);
    expect(m.frameCount).toBe(4);
    expect(m.engagementMean).toBeCloseTo(0.6625, 3);
    expect(m.engagementMin).toBe(0.4);
    expect(m.engagementMinAt).toBe(20);
    expect(m.engagementDips.some((d) => d.t === 20)).toBe(true);
    expect(m.factLines.length).toBeGreaterThan(0);
    expect(m.factLines.join(' ')).not.toMatch(/happy|sad|angry/i);
  });

  it('computes talk ratio and questions from transcript', () => {
    const m = computeMetrics(
      [{ t: 0, engagement: 0.5 }],
      [
        { speaker: 'user', t: 0, text: 'I have been thinking about work a lot lately.' },
        { speaker: 'user', t: 10, text: 'And then the project deadlines piled up.' },
        { speaker: 'partner', t: 40, text: 'What happened next?' },
        { speaker: 'user', t: 45, text: 'Not much.' },
      ],
    );
    expect(m.userQuestionCount).toBe(0);
    expect(m.partnerQuestionCount).toBe(1);
    expect(m.userTalkRatio).not.toBeNull();
    expect(m.userTalkRatio!).toBeGreaterThan(0.5);
    expect(m.longestUserMonologueSec).toBeGreaterThan(0);
  });

  it('handles empty inputs', () => {
    const m = computeMetrics([]);
    expect(m.frameCount).toBe(0);
    expect(m.engagementMean).toBeNull();
    expect(m.userTalkRatio).toBeNull();
  });
});
