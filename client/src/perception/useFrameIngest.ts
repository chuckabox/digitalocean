import { useEffect, useRef } from 'react';
import type { SignalFrame } from 'shared';
import { ingestFrames } from '@/api/frames';

/** Batch-upload new frames every `intervalMs` (default 5s). Uses a ref so interval stays stable. */
export function useFrameIngest(
  sessionId: string | null,
  frames: SignalFrame[],
  intervalMs = 5000,
) {
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const sentUpTo = useRef(0);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  useEffect(() => {
    sentUpTo.current = 0;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const tick = async () => {
      const id = sessionRef.current;
      if (!id) return;
      const all = framesRef.current;
      const slice = all.slice(sentUpTo.current);
      if (slice.length === 0) return;
      const batch = slice.slice(0, 120);
      try {
        await ingestFrames({ sessionId: id, frames: batch });
        sentUpTo.current += batch.length;
      } catch (err) {
        console.warn('frame ingest failed', err);
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);
    return () => clearInterval(id);
  }, [sessionId, intervalMs]);
}

/** Flush any unsent frames once (e.g. on end session). */
export async function flushFrames(sessionId: string | null, frames: SignalFrame[], sentUpTo: number) {
  if (!sessionId) return 0;
  const slice = frames.slice(sentUpTo);
  if (slice.length === 0) return sentUpTo;
  let offset = 0;
  while (offset < slice.length) {
    const batch = slice.slice(offset, offset + 120);
    await ingestFrames({ sessionId, frames: batch });
    offset += batch.length;
  }
  return sentUpTo + slice.length;
}
