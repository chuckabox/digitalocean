import { useEffect, useRef } from 'react';
import type { SignalFrame } from 'shared';
import { estimateEmotion } from './estimateEmotion';

declare global {
  interface Window {
    __wlDip?: boolean;
    __wlMask?: boolean;
  }
}

/** Produces a gentle sine engagement curve at 5 Hz; press B in LIVE to dip (dev rehearsal aid). */
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
      // "masked" beat: face stays warm while the body's arousal + heart rate spike.
      if (e.key === 'n' || e.key === 'N') {
        window.__wlMask = true;
        window.setTimeout(() => {
          window.__wlMask = false;
        }, 12_000);
      }
    };
    window.addEventListener('keydown', onKey);

    const id = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const dip = window.__wlDip ? 0.28 : 0;
      const engagement = Math.max(0, Math.min(1, 0.72 + 0.12 * Math.sin(t / 8) - dip));
      const attention = Math.max(0, Math.min(1, engagement * 0.95 - (window.__wlDip ? 0.15 : 0)));
      const smile = engagement * 0.45;
      const gazeAway = 1 - attention;
      const browFurrow = window.__wlDip ? 0.45 : 0.08;
      const browRaise = window.__wlDip ? 0.35 : 0.1;
      const jawOpen = 0.05 + 0.04 * Math.sin(t * 2);
      // Body channel: as engagement falls (the dip), arousal + heart rate climb —
      // the face reads flat/disengaged while the body tenses. In the "masked" beat
      // (press N) the face stays warm while arousal spikes — that clean face/body
      // divergence is "The Tell" the debrief is built to surface.
      const masked = window.__wlMask === true;
      const arousal = masked
        ? Math.max(0.85, 0.5 + (0.72 - engagement) * 1.5)
        : Math.max(0, Math.min(1, 0.5 + (0.72 - engagement) * 1.5));
      const bpm = Math.round(62 + arousal * 22 + 1.5 * Math.sin(t / 4));
      const motionEnergy = Math.max(
        0,
        Math.min(1, (jawOpen > 0.08 ? 0.32 : 0.12) + 0.1 * Math.sin(t * 1.3)),
      );
      const emotions = estimateEmotion({
        smile,
        frown: window.__wlDip ? 0.35 : 0.04,
        browRaise,
        browFurrow,
        eyeOpenness: 0.85,
        gazeAway,
        jawOpen,
      });
      onFrameRef.current({
        t: Math.round(t * 1000) / 1000,
        engagement,
        attention,
        valence: Math.max(-1, Math.min(1, (engagement - 0.5) * 1.2)),
        signals: {
          smile,
          gazeAway,
          browFurrow,
          browRaise,
          jawOpen,
          talking: jawOpen > 0.08 ? 0.4 : 0.05,
          bpm,
          pulseConf: 0.7,
          arousal,
          motionEnergy,
          emotionCalm: emotions.calm,
          emotionHappy: emotions.happy,
          emotionSad: emotions.sad,
          emotionTense: emotions.tense,
          emotionSurprised: emotions.surprised,
          emotionUncertain: emotions.uncertain,
        },
        emotions,
        confidence: engagement < 0.45 ? 'high' : engagement < 0.6 ? 'medium' : 'low',
      });
    }, 200);

    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
      window.__wlDip = false;
    };
  }, [enabled]);
}
