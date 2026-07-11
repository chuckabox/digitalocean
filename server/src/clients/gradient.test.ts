import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { extractValidJson } from './gradient.js';

const Nudge = z.object({
  text: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});

describe('extractValidJson (structured-output repair loop)', () => {
  it('returns the parsed object on a valid first attempt', async () => {
    const attempt = vi.fn().mockResolvedValue('{"text":"hi","confidence":"low"}');
    const out = await extractValidJson(Nudge, attempt);
    expect(out).toEqual({ text: 'hi', confidence: 'low' });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith(null); // no correction on first try
  });

  it('repairs after a schema-invalid first attempt', async () => {
    const attempt = vi
      .fn()
      .mockResolvedValueOnce('{"text":"hi","confidence":"BOGUS"}') // fails enum
      .mockResolvedValueOnce('{"text":"hi","confidence":"high"}');
    const out = await extractValidJson(Nudge, attempt);
    expect(out.confidence).toBe('high');
    expect(attempt).toHaveBeenCalledTimes(2);
    // second call carries a correction message
    expect(attempt.mock.calls[1]?.[0]).toContain('invalid');
  });

  it('repairs after malformed JSON', async () => {
    const attempt = vi
      .fn()
      .mockResolvedValueOnce('not json at all')
      .mockResolvedValueOnce('{"text":"ok","confidence":"medium"}');
    const out = await extractValidJson(Nudge, attempt);
    expect(out.text).toBe('ok');
  });

  it('throws upstream error after exhausting attempts', async () => {
    const attempt = vi.fn().mockResolvedValue('{"text":123}'); // always invalid
    await expect(extractValidJson(Nudge, attempt, 2)).rejects.toThrow(/failed schema validation/);
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
