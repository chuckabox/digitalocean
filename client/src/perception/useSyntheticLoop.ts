import { useEffect, useRef } from 'react';
import type { SignalFrame } from 'shared';

declare global {
  interface Window {
    __wlDip?: boolean;
  }
}

/** Produces a gentle sine engagement curve; press B in LIVE to dip (dev rehearsal aid). */
export function useSyntheticLoop(
  enabled: boolean,
  onFrame: (frame: SignalFrame) => void,
) {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!enabled) return;
    const t0 = performance.now();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        window.__wlDip = true;
        window.setTimeout(() => {
          window.__wlDip = false;
        }, 12_000);
      }
    };
    window.addEventListener('keydown', onKey);

    const id = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const dip = window.__wlDip ? 0.28 : 0;
      const engagement = Math.max(0, Math.min(1, 0.72 + 0.12 * Math.sin(t / 8) - dip));
      const attention = Math.max(0, Math.min(1, engagement * 0.95 - (window.__wlDip ? 0.15 : 0)));
      onFrameRef.current({
        t: Math.round(t * 10) / 10,
        engagement,
        attention,
        valence: Math.max(-1, Math.min(1, (engagement - 0.5) * 1.2)),
        signals: {
          smile: engagement * 0.45,
          gazeAway: 1 - attention,
          lean: engagement * 0.3,
        },
        confidence: engagement < 0.45 ? 'high' : engagement < 0.6 ? 'medium' : 'low',
      });
    }, 1000);

    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
      window.__wlDip = false;
    };
  }, [enabled]);
}
