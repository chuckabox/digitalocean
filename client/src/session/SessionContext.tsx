import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { NudgeResponse, SignalFrame, TranscriptTurn } from 'shared';
import * as sessionsApi from '@/api/sessions';

export type AppPhase = 'home' | 'live' | 'debrief';

export type NudgeEvent = NudgeResponse & { t: number; id: string };

type SessionState = {
  phase: AppPhase;
  setPhase: (p: AppPhase) => void;
  sessionId: string | null;
  context: string;
  setContext: (c: string) => void;
  frames: SignalFrame[];
  appendFrames: (f: SignalFrame[]) => void;
  transcript: TranscriptTurn[];
  appendTranscript: (t: TranscriptTurn) => void;
  nudges: NudgeEvent[];
  pushNudge: (n: NudgeResponse, t: number) => void;
  startedAtMs: number | null;
  starting: boolean;
  startError: string | null;
  startSession: () => Promise<void>;
  endAndDebrief: () => Promise<void>;
  kill: () => void;
  reset: () => void;
  registerCleanup: (fn: (() => void) | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

/** ~30 min at 5 Hz */
const MAX_FRAMES = 9000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AppPhase>('home');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [frames, setFrames] = useState<SignalFrame[]>([]);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [nudges, setNudges] = useState<NudgeEvent[]>([]);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const registerCleanup = useCallback((fn: (() => void) | null) => {
    cleanupRef.current = fn;
  }, []);

  const runCleanup = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const appendFrames = useCallback((batch: SignalFrame[]) => {
    if (batch.length === 0) return;
    setFrames((prev) => {
      const next = prev.concat(batch);
      return next.length > MAX_FRAMES ? next.slice(next.length - MAX_FRAMES) : next;
    });
  }, []);

  const appendTranscript = useCallback((turn: TranscriptTurn) => {
    setTranscript((prev) => [...prev, turn]);
  }, []);

  const pushNudge = useCallback((n: NudgeResponse, t: number) => {
    setNudges((prev) => [
      ...prev,
      { ...n, t, id: `${Date.now()}-${prev.length}` },
    ]);
  }, []);

  const resetBuffers = useCallback(() => {
    setFrames([]);
    setTranscript([]);
    setNudges([]);
    setStartedAtMs(null);
    setSessionId(null);
    setStartError(null);
  }, []);

  const startSession = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    let id: string;
    try {
      const session = await Promise.race([
        sessionsApi.createSession({ context: context.trim() || undefined }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('session start timed out')), 2500),
        ),
      ]);
      id = session.id;
    } catch {
      // Offline / backend-down fallback: run the session locally so perception,
      // nudges (canned) and the debrief (client-computed) all still work. The
      // demo never dies on wifi — only the AI phrasing degrades gracefully.
      id = crypto.randomUUID();
      setStartError('Offline mode — running locally (AI phrasing may be limited)');
    } finally {
      setStarting(false);
    }
    setSessionId(id);
    setFrames([]);
    setTranscript([]);
    setNudges([]);
    setStartedAtMs(Date.now());
    setPhase('live');
  }, [context]);

  const endAndDebrief = useCallback(async () => {
    runCleanup();
    if (sessionId) {
      try {
        await sessionsApi.endSession(sessionId);
      } catch (err) {
        console.warn('end session failed', err);
      }
    }
    setPhase('debrief');
  }, [runCleanup, sessionId]);

  const kill = useCallback(() => {
    runCleanup();
    resetBuffers();
    setPhase('home');
  }, [resetBuffers, runCleanup]);

  const reset = useCallback(() => {
    runCleanup();
    resetBuffers();
    setContext('');
    setPhase('home');
  }, [resetBuffers, runCleanup]);

  const value = useMemo<SessionState>(
    () => ({
      phase,
      setPhase,
      sessionId,
      context,
      setContext,
      frames,
      appendFrames,
      transcript,
      appendTranscript,
      nudges,
      pushNudge,
      startedAtMs,
      starting,
      startError,
      startSession,
      endAndDebrief,
      kill,
      reset,
      registerCleanup,
    }),
    [
      phase,
      sessionId,
      context,
      frames,
      appendFrames,
      transcript,
      appendTranscript,
      nudges,
      pushNudge,
      startedAtMs,
      starting,
      startError,
      startSession,
      endAndDebrief,
      kill,
      reset,
      registerCleanup,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
