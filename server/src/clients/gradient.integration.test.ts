import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { chat, stream, structured, listModels } from './gradient.js';

const hasKey = Boolean(process.env.DIGITAL_OCEAN_MODEL_ACCESS_KEY);

// Hits real DO Gradient. Auto-skips without a key.
describe.skipIf(!hasKey)('gradient client (integration)', () => {
  it('lists models including our configured names', async () => {
    const ids = await listModels();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain(process.env.MODEL_FAST ?? 'anthropic-claude-haiku-4.5');
  });

  it('chat returns text', async () => {
    const out = await chat({ prompt: 'Reply with exactly one word: pong', maxTokens: 16 });
    expect(out.toLowerCase()).toContain('pong');
  });

  it('structured returns a schema-valid object via forced tool-call', async () => {
    const Nudge = z.object({
      text: z.string().min(1),
      confidence: z.enum(['low', 'medium', 'high']),
    });
    const out = await structured(Nudge, {
      prompt: 'A conversation partner is smiling and leaning in. Emit one hedged nudge.',
      toolName: 'emit_nudge',
      toolDescription: 'Emit a single hedged, actionable nudge with a confidence level.',
    });
    expect(Nudge.safeParse(out).success).toBe(true);
  });

  it('stream yields text chunks', async () => {
    let chunks = 0;
    let text = '';
    for await (const delta of stream({ prompt: 'Count: one two three', maxTokens: 32 })) {
      chunks++;
      text += delta;
    }
    expect(chunks).toBeGreaterThan(0);
    expect(text.length).toBeGreaterThan(0);
  });
});
