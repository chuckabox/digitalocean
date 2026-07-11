import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NudgeRequest } from 'shared';

vi.mock('../clients/gradient.js', () => ({
  structured: vi.fn(),
}));

import { structured } from '../clients/gradient.js';
import { AppError } from '../errors.js';
import { phraseNudge } from './nudge.js';

const structuredMock = vi.mocked(structured);

describe('phraseNudge', () => {
  beforeEach(() => {
    structuredMock.mockReset();
  });

  const req: NudgeRequest = {
    confidence: 'medium',
    evidence: ['gaze away 9s', "you've held the floor 84s"],
    context: 'catching up with a friend',
  };

  it('returns structured LLM output and echoes evidence', async () => {
    structuredMock.mockResolvedValueOnce({
      text: 'They may be drifting — maybe ask a question?',
      confidence: 'medium',
    });
    const out = await phraseNudge(req);
    expect(out.text).toMatch(/ask a question/i);
    expect(out.evidence).toEqual(req.evidence);
    expect(structuredMock).toHaveBeenCalledOnce();
  });

  it('falls back to canned nudge on upstream_error', async () => {
    structuredMock.mockRejectedValueOnce(AppError.upstream('no key'));
    const out = await phraseNudge(req);
    expect(out.text.length).toBeGreaterThan(10);
    expect(out.confidence).toBe('medium');
    expect(out.evidence).toEqual(req.evidence);
  });
});
