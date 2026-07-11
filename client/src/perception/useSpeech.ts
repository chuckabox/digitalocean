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
  onInterim?: (text: string) => void,
) {
  const onTurnRef = useRef(onTurn);
  onTurnRef.current = onTurn;
  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;
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
    // interimResults streams partial text as the user is still speaking, so the
    // transcript feels live instead of only appearing after each sentence ends.
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (ev) => {
      const t0 = startedRef.current ?? Date.now();
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript ?? '';
        if (result?.isFinal) {
          const trimmed = text.trim();
          if (trimmed) {
            const t = Math.max(0, (Date.now() - t0) / 1000);
            onTurnRef.current({ speaker: 'user', t, text: trimmed });
          }
        } else {
          interim += text;
        }
      }
      // Show whatever is still being spoken (empty once the last result finalizes).
      onInterimRef.current?.(interim.trim());
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
      onInterimRef.current?.('');
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);
}
