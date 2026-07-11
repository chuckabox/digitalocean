import { useEffect, useRef } from 'react';
import type { TranscriptTurn } from 'shared';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Chrome Web Speech → TranscriptTurn[]. Restarts on end while enabled.
 * Defaults speaker to `user` (talk-time split is a later refinement).
 */
export function useSpeech(
  enabled: boolean,
  startedAtMs: number | null,
  onTurn: (turn: TranscriptTurn) => void,
) {
  const onTurnRef = useRef(onTurn);
  onTurnRef.current = onTurn;
  const startedRef = useRef(startedAtMs);
  startedRef.current = startedAtMs;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;
    const rec = getRecognition();
    if (!rec) {
      console.warn('Web Speech API unavailable — debrief will be signals-only');
      return;
    }

    let stopped = false;
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (ev) => {
      const t0 = startedRef.current ?? Date.now();
      const t = Math.max(0, (Date.now() - t0) / 1000);
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (!result?.isFinal) continue;
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        onTurnRef.current({ speaker: 'user', t, text });
      }
    };

    rec.onerror = (ev) => {
      if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        console.warn('speech error', ev.error);
      }
    };

    rec.onend = () => {
      if (!stopped && enabledRef.current) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.warn('speech start failed', err);
    }

    return () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);
}
