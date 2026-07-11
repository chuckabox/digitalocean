import type { DebriefRequest, DebriefSseEvent } from 'shared';
import { API_BASE, ApiError } from './base';

export type DebriefHandlers = {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

/** POST /v1/debrief and parse SSE `data:` events (EventSource cannot POST a body). */
export async function streamDebrief(
  body: DebriefRequest,
  handlers: DebriefHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/debrief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new ApiError('Debrief request failed', res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const raw = line.slice(5).trim();
      let event: DebriefSseEvent;
      try {
        event = JSON.parse(raw) as DebriefSseEvent;
      } catch {
        continue;
      }
      if (event.type === 'delta') handlers.onDelta(event.text);
      else if (event.type === 'done') handlers.onDone();
      else if (event.type === 'error') handlers.onError(event.message);
    }
  }
}
