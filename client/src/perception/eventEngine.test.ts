import { describe, it, expect } from 'vitest';
import { considerNudge, createEngineState } from './eventEngine';

describe('considerNudge', () => {
  it('does not nudge on first frames while baseline forms', () => {
    let state = createEngineState();
    for (let t = 0; t < 5; t++) {
      const out = considerNudge(state, { t, engagement: 0.8 }, {
        cooldownS: 1,
        dipHoldS: 2,
        dipZ: -1.5,
      });
      state = out.state;
      expect(out.candidate).toBeNull();
    }
  });

  it('emits a candidate after a sustained engagement dip', () => {
    let state = createEngineState();
    const opts = { cooldownS: 1, dipHoldS: 3, dipZ: -1.0 };

    // Establish high baseline
    for (let t = 0; t < 20; t++) {
      const out = considerNudge(state, { t, engagement: 0.9 }, opts);
      state = out.state;
    }

    // Plunge and hold
    let candidate = null;
    for (let t = 20; t < 40; t++) {
      const out = considerNudge(state, { t, engagement: 0.1 }, opts);
      state = out.state;
      if (out.candidate) {
        candidate = out.candidate;
        break;
      }
    }

    expect(candidate).not.toBeNull();
    expect(candidate!.evidence.length).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(candidate!.confidence);
  });

  it('respects cooldown after a nudge', () => {
    let state = createEngineState();
    const opts = { cooldownS: 30, dipHoldS: 2, dipZ: -1.0 };

    for (let t = 0; t < 15; t++) {
      state = considerNudge(state, { t, engagement: 0.9 }, opts).state;
    }

    let firstAt: number | null = null;
    for (let t = 15; t < 80; t++) {
      const out = considerNudge(state, { t, engagement: 0.05 }, opts);
      state = out.state;
      if (out.candidate && firstAt == null) {
        firstAt = t;
        continue;
      }
      if (firstAt != null && t > firstAt && t < firstAt + 30) {
        expect(out.candidate).toBeNull();
      }
    }
    expect(firstAt).not.toBeNull();
  });
});
