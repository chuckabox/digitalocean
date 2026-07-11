import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DebriefRequest } from 'shared';

vi.mock('../clients/gradient.js', () => ({
  stream: vi.fn(),
}));

vi.mock('../repositories/frames.js', () => ({
  getFrames: vi.fn(),
}));

import { stream } from '../clients/gradient.js';
import { AppError } from '../errors.js';
import { streamDebrief } from './debrief.js';

const streamMock = vi.mocked(stream);

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = '';
  for await (const chunk of gen) out += chunk;
  return out;
}

describe('streamDebrief', () => {
  beforeEach(() => {
    streamMock.mockReset();
  });

  const req: DebriefRequest = {
    context: 'mixer chat',
    transcript: [
      { speaker: 'user', t: 0, text: 'So about that project…' },
      { speaker: 'partner', t: 20, text: 'Interesting — what do you mean?' },
    ],
    frames: [
      { t: 0, engagement: 0.8 },
      { t: 15, engagement: 0.45 },
      { t: 30, engagement: 0.7 },
    ],
  };

  it('yields stream deltas', async () => {
    streamMock.mockImplementationOnce(async function* () {
      yield 'Hello ';
      yield 'world.';
    });
    const text = await collect(streamDebrief(req));
    expect(text).toBe('Hello world.');
  });

  it('yields canned debrief on upstream_error', async () => {
    streamMock.mockImplementationOnce(async function* () {
      throw AppError.upstream('down');
      yield ''; // unreachable — satisfies generator type
    });
    const text = await collect(streamDebrief(req));
    expect(text).toMatch(/offline debrief|Gradient unavailable/i);
    expect(text).not.toMatch(/\b(happy|sad|angry)\b/i);
  });
});
