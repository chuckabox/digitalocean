# Client → `/v1` Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the React client to the live Express `/v1` API so the demo is one page with three states — CONSENT → LIVE → DEBRIEF — with real session lifecycle, frame ingest, nudges, and streaming debrief.

**Architecture:** A thin `api/` client + `SessionProvider` context owns server identity and in-memory perception buffers. Perception stays in the browser (MediaPipe → derived signals → 1 Hz frames → deterministic event engine). The server only receives features + transcript and returns hedged nudge text / SSE debrief. Ship a **synthetic signal loop first** so API wiring is demoable before MediaPipe lands (parallel: Peter API, Dinil perception).

**Tech Stack:** React 19, Vite 8, `shared` Zod contracts, `@mediapipe/tasks-vision`, Web Speech API, `fetch` + ReadableStream for SSE, Express `/v1` on App Platform / localhost:8080.

**Live API:** https://wavelength-wxut4.ondigitalocean.app · Contract SoT: `shared/src/contracts/*` · Do not follow obsolete `docs/INTEGRATION.md`.

---

## Current gap (read once)

| Layer | Today | Needed |
|---|---|---|
| `client/` | Hash views `home\|live\|stats\|timeline`; mock `sessions.ts`; getUserMedia only | 3-state machine; real `/v1`; MediaPipe; SSE debrief |
| `shared/` | Full Zod contract | Client dependency + imports |
| `server/` | `/v1` complete + live | Unchanged (client adapts) |

**Locked product rules:** never emotion labels; raw video/audio never leave the laptop; client decides *when* to nudge (no server cooldown); never cut nudge or debrief.

---

## Target file structure

```
client/
├── package.json                    # + "shared": "*", @mediapipe/tasks-vision
├── vite.config.ts                  # proxy /v1 → :8080
└── src/
    ├── App.tsx                     # phase: consent | live | debrief
    ├── main.tsx
    ├── api/
    │   ├── base.ts                 # API_BASE, jsonFetch, ApiError
    │   ├── sessions.ts
    │   ├── frames.ts
    │   ├── nudge.ts
    │   └── debrief.ts              # POST + SSE parser
    ├── session/
    │   ├── SessionContext.tsx      # sessionId, context, phase, frames, transcript, nudges
    │   └── types.ts
    ├── perception/
    │   ├── types.ts
    │   ├── deriveSignals.ts        # blendshapes → smile/gaze/…
    │   ├── engagement.ts           # baseline + engagement/valence/attention
    │   ├── eventEngine.ts          # z-score + hysteresis + 90s cooldown
    │   ├── useMediaPipe.ts         # Face Landmarker ~12 Hz
    │   ├── useSyntheticLoop.ts     # clock-driven fake frames (Phase C)
    │   ├── useSpeech.ts            # Web Speech → TranscriptTurn[]
    │   └── useFrameIngest.ts       # batch POST /v1/frames every ~5s
    ├── components/
    │   ├── ConsentView.tsx         # NEW — mirror + I consent + context + kill switch
    │   ├── LiveView.tsx            # bind real signals / nudge toast / End session
    │   ├── DebriefView.tsx         # NEW — timeline + streaming text (+ embed stats)
    │   ├── NudgeToast.tsx          # NEW
    │   ├── LandingPage.tsx         # optional marketing; CTA → consent
    │   ├── StatsView.tsx           # rewrite off emotion labels → signal descriptors
    │   ├── TimelineView.tsx        # bind session frames + nudge markers
    │   └── Header.tsx              # simplify for 3 states
    └── data/
        └── sessions.ts             # KEEP as offline / empty-state fallback only
```

---

## State machine & data flow

```
Landing (optional)
    → ConsentView  [camera preview local-only]
         on both "I consent" + context
         → POST /v1/sessions { context }
         → phase = live
    → LiveView
         MediaPipe ~12Hz → derive → 1Hz SignalFrame[] (memory)
         every ~5s → POST /v1/frames { sessionId, frames }
         eventEngine → POST /v1/nudge → NudgeToast
         Web Speech → transcript[]
         End session
         → POST /v1/sessions/:id/end
         → phase = debrief
    → DebriefView
         POST /v1/debrief { sessionId, context, transcript, frames? }
         SSE delta* → typewriter; done → finalize
         Timeline from in-memory frames (+ GET /v1/sessions/:id/frames fallback)
```

**App phase type:**

```ts
type AppPhase = 'home' | 'consent' | 'live' | 'debrief';
```

Demo critical path uses `consent → live → debrief`. Keep `home` as optional marketing entry. Collapse current Header tabs: during `live`, hide stats/timeline; during `debrief`, show timeline + signal stats as sections (not separate mock sessions).

---

## Phase overview (each leaves a working increment)

| Phase | Working increment | Owner bias |
|---|---|---|
| **0** | `shared` linked + Vite proxy + typed API client; `POST /v1/sessions` from browser | Peter |
| **1** | Consent gate + session create/end + kill switch | Peter |
| **2** | Synthetic LIVE loop → frames ingest + manual nudge button hits `/v1/nudge` | Peter |
| **3** | MediaPipe → derived signals → live engagement chart (replace synthetic) | Dinil |
| **4** | Deterministic event engine + auto nudge + cooldown + toast | Dinil + Peter |
| **5** | Web Speech transcript + talk-time hints | either |
| **6** | End → DebriefView SSE stream + timeline from real frames | Peter |
| **7** | Polish: confidence badges, cut emotion labels from Stats, offline fallback, deploy smoke | both |

**Cut order under pressure:** Web Speech → frame persistence (inline frames on debrief only) → stats polish. **Never cut** nudge or debrief SSE.

---

### Task 0: Link `shared` + Vite proxy + API client

**Files:**
- Modify: `client/package.json`
- Modify: `client/vite.config.ts`
- Create: `client/src/api/base.ts`
- Create: `client/src/api/sessions.ts`
- Create: `client/src/api/frames.ts`
- Create: `client/src/api/nudge.ts`
- Create: `client/src/api/debrief.ts`
- Create: `client/src/api/index.ts`

- [ ] **Step 0.1: Add workspace dependency**

In `client/package.json` dependencies:

```json
"shared": "*"
```

Run from repo root:

```bash
npm install
npm run build -w shared
```

Expected: `shared/dist/` exists; client resolves `import … from 'shared'`.

- [ ] **Step 0.2: Proxy `/v1` in Vite**

```ts
// client/vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/v1': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
      '/ready': 'http://localhost:8080',
    },
  },
})
```

Prod SPA is same-origin on App Platform → relative `/v1` works with empty base.

- [ ] **Step 0.3: API base helper**

```ts
// client/src/api/base.ts
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Empty string = same origin (Vite proxy in dev, Express in prod). */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export async function jsonFetch<T>(
  path: string,
  init?: RequestInit & { parseAs?: 'json' },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let code: string | undefined;
    let message = res.statusText;
    let requestId: string | undefined;
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string; requestId?: string };
      };
      code = body.error?.code;
      message = body.error?.message ?? message;
      requestId = body.error?.requestId;
    } catch {
      /* non-JSON */
    }
    throw new ApiError(message, res.status, code, requestId);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

- [ ] **Step 0.4: Session / frames / nudge wrappers**

```ts
// client/src/api/sessions.ts
import type { SessionCreateRequest, SessionResponse } from 'shared';
import { jsonFetch } from './base';

export function createSession(body: SessionCreateRequest = {}) {
  return jsonFetch<SessionResponse>('/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSession(id: string) {
  return jsonFetch<SessionResponse>(`/v1/sessions/${id}`);
}

export function endSession(id: string) {
  return jsonFetch<SessionResponse>(`/v1/sessions/${id}/end`, { method: 'POST' });
}
```

```ts
// client/src/api/frames.ts
import type { FramesIngestRequest, FramesIngestResponse, FramesListResponse } from 'shared';
import { jsonFetch } from './base';

export function ingestFrames(body: FramesIngestRequest) {
  return jsonFetch<FramesIngestResponse>('/v1/frames', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listFrames(sessionId: string) {
  return jsonFetch<FramesListResponse>(`/v1/sessions/${sessionId}/frames`);
}
```

```ts
// client/src/api/nudge.ts
import type { NudgeRequest, NudgeResponse } from 'shared';
import { jsonFetch } from './base';

export function requestNudge(body: NudgeRequest) {
  return jsonFetch<NudgeResponse>('/v1/nudge', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
```

- [ ] **Step 0.5: SSE debrief client (POST required — not EventSource)**

```ts
// client/src/api/debrief.ts
import type { DebriefRequest, DebriefSseEvent } from 'shared';
import { API_BASE, ApiError } from './base';

export type DebriefHandlers = {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

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
```

- [ ] **Step 0.6: Smoke from browser console / tiny throwaway button**

Terminal A:

```bash
# from repo root, with server/.env loaded
npm run build -w shared && npm run dev -w server
```

Terminal B:

```bash
npm run dev -w client
```

In DevTools on `http://localhost:5173`:

```js
await fetch('/v1/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json())
```

Expected: `{ id, createdAt, endedAt: null, context: null }`.

- [ ] **Step 0.7: Commit** (only if user asks)

```bash
git add client/package.json client/vite.config.ts client/src/api package-lock.json
git commit -m "feat(client): add shared dependency, Vite /v1 proxy, and typed API client"
```

**Phase 0 gate:** Browser can create a session against local (or live) `/v1` without CORS errors.

---

### Task 1: Session context + CONSENT → LIVE gate

**Files:**
- Create: `client/src/session/SessionContext.tsx`
- Create: `client/src/components/ConsentView.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Header.tsx`
- Modify: `client/src/components/LandingPage.tsx`

- [ ] **Step 1.1: Session provider**

```tsx
// client/src/session/SessionContext.tsx (sketch)
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SignalFrame, TranscriptTurn, NudgeResponse } from 'shared';
import * as sessionsApi from '@/api/sessions';

export type AppPhase = 'home' | 'consent' | 'live' | 'debrief';

type NudgeEvent = NudgeResponse & { t: number; id: string };

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
  startSession: () => Promise<void>;
  endAndDebrief: () => Promise<void>;
  kill: () => void; // stop media + clear; stay or go home
  reset: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // implement with useState; startSession calls sessionsApi.createSession({ context })
  // endAndDebrief calls sessionsApi.endSession then setPhase('debrief')
  // kill clears frames/transcript and stops tracks via a registered cleanup ref
  return <SessionContext.Provider value={/* … */}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside provider');
  return ctx;
}
```

Keep implementation lean: no Redux. Frames stay in memory (also posted to server). Cap frames array at ~3600 if needed.

- [ ] **Step 1.2: ConsentView**

Requirements from BUILD_PLAN §1:
- Bullet list of what is tracked (signals, attention, speech text — video never leaves laptop)
- Optional live mirror (`getUserMedia` preview only; no upload)
- Context textarea (max 2000, matches contract)
- Big **I consent** (demo can use one button + partner verbal consent; two checkboxes if time)
- Red **Kill switch** visible (stops tracks, clears buffers, `setPhase('home')`)

On consent success: `await startSession()` → `setPhase('live')`.

- [ ] **Step 1.3: App phase routing**

Replace four-way always-available nav:

```tsx
// App.tsx sketch
{phase === 'home' && <LandingPage onEnterApp={() => setPhase('consent')} />}
{phase === 'consent' && <ConsentView />}
{phase === 'live' && <LiveView />}
{phase === 'debrief' && <DebriefView />}
```

Header during `live`: brand + kill switch + End session. During `debrief`: brand + New session.

- [ ] **Step 1.4: Verify**

1. Landing → Consent → I consent → Live mounts
2. Network tab shows `POST /v1/sessions` 201
3. Kill switch returns home and stops camera tracks
4. Without consent, Live is unreachable via Header

**Phase 1 gate:** Consent is a real gate; every live session has a server `sessionId`.

---

### Task 2: Synthetic LIVE loop + frames + manual nudge

**Why before MediaPipe:** Unblocks E2E on `/v1` while Dinil builds perception. Demo can still show API + LLM if face tracking slips.

**Files:**
- Create: `client/src/perception/useSyntheticLoop.ts`
- Create: `client/src/perception/useFrameIngest.ts`
- Create: `client/src/components/NudgeToast.tsx`
- Modify: `client/src/components/LiveView.tsx`

- [ ] **Step 2.1: Synthetic 1 Hz frames**

```ts
// client/src/perception/useSyntheticLoop.ts
import { useEffect, useRef } from 'react';
import type { SignalFrame } from 'shared';

/** Produces a gentle sine engagement curve; press B to dip (demo helper). */
export function useSyntheticLoop(
  enabled: boolean,
  onFrame: (frame: SignalFrame) => void,
) {
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    t0.current = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - (t0.current ?? 0)) / 1000;
      const dip = (window as unknown as { __wlDip?: boolean }).__wlDip ? 0.25 : 0;
      const engagement = Math.max(0, Math.min(1, 0.72 + 0.12 * Math.sin(t / 8) - dip));
      onFrame({
        t,
        engagement,
        attention: engagement * 0.95,
        valence: (engagement - 0.5) * 1.2,
        signals: { smile: engagement * 0.4, gazeAway: 1 - engagement },
        confidence: engagement < 0.45 ? 'high' : 'medium',
      });
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, onFrame]);
}
```

Wire a hidden key `b` in LiveView to set `__wlDip = true` for 12s (rehearsal aid — remove or gate behind `import.meta.env.DEV`).

- [ ] **Step 2.2: Batch ingest every 5s**

```ts
// client/src/perception/useFrameIngest.ts
import { useEffect, useRef } from 'react';
import type { SignalFrame } from 'shared';
import { ingestFrames } from '@/api/frames';

export function useFrameIngest(sessionId: string | null, frames: SignalFrame[]) {
  const sentUpTo = useRef(0);
  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(async () => {
      const slice = frames.slice(sentUpTo.current);
      if (slice.length === 0) return;
      const batch = slice.slice(0, 120);
      try {
        await ingestFrames({ sessionId, frames: batch });
        sentUpTo.current += batch.length;
      } catch (err) {
        console.warn('frame ingest failed', err);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [sessionId, frames]);
}
```

Note: depending on `frames` array identity will re-bind the interval — prefer appending via ref or pass `getFrames: () => SignalFrame[]` to avoid resets. Prefer **ref-based buffer** in final code.

- [ ] **Step 2.3: Bind LiveView panels to latest frame**

Replace hardcoded Happiness/Tension/Interest with:
- Engagement % from `frame.engagement`
- Attention % from `frame.attention`
- Confidence badge from `frame.confidence`
- Signal descriptors from `frame.signals` keys (`gazeAway`, `smile`, …) — **never** emotion category words

- [ ] **Step 2.4: Manual “Request nudge” button**

```ts
await requestNudge({
  sessionId,
  context,
  confidence: latest.confidence ?? 'medium',
  evidence: [
    `engagement ~${Math.round((latest.engagement ?? 0) * 100)}%`,
    `attention ~${Math.round((latest.attention ?? 0) * 100)}%`,
  ],
  recentFrames: frames.slice(-5),
});
```

Show `NudgeToast` with `text`, confidence badge, evidence chips.

- [ ] **Step 2.5: Verify**

1. Consent → Live: engagement number moves every second
2. Network: `POST /v1/frames` every ~5s with `{ inserted: N }`
3. Manual nudge → `POST /v1/nudge` → toast with hedged text (or canned fallback if inference down)
4. Rate limit awareness: keep manual clicks under ~20/min

**Phase 2 gate:** Full HTTPS path session → frames → nudge works without MediaPipe.

---

### Task 3: MediaPipe perception pipeline

**Files:**
- Create: `client/src/perception/useMediaPipe.ts`
- Create: `client/src/perception/deriveSignals.ts`
- Create: `client/src/perception/engagement.ts`
- Modify: `client/package.json` — add `@mediapipe/tasks-vision`
- Modify: `client/src/components/LiveView.tsx` — swap synthetic → MediaPipe when ready; keep synthetic as `?synthetic=1` fallback

- [ ] **Step 3.1: Install**

```bash
npm install @mediapipe/tasks-vision -w client
```

Pin near `0.10.35` if possible (BUILD_PLAN). Load WASM/model from CDN or `public/` — prefer official Google CDN for hackathon speed.

- [ ] **Step 3.2: Face Landmarker hook**

Responsibilities:
- Attach to `<video>` stream
- `RunningMode.VIDEO`, GPU delegate if available
- Throttle detect to ~12 Hz (`lastVideoTime` guard)
- Emit blendshapes + facial transformation matrix each tick

- [ ] **Step 3.3: `deriveSignals` pure functions**

Per BUILD_PLAN §4 (implement as pure TS, unit-testable without DOM):

| Signal | Formula sketch |
|---|---|
| `smile` | mean(mouthSmileL, mouthSmileR) |
| `browRaise` / `browFurrow` | brow blendshapes |
| `eyeOpenness` | 1 − mean(eyeBlink L/R) |
| `gazeAway` | \|yaw\| > ~20° or \|pitch\| > ~15° from matrix |
| `lean` | interocular distance vs rolling baseline |
| `talking` | jawOpen variance |

- [ ] **Step 3.4: Baseline + engagement**

- First 60–90s: accumulate per-person baseline
- `engagement` = weighted blend of gaze-on, smile, lean, expressivity **deltas vs baseline**, clamped `[0,1]`
- `valence` in `[-1,1]` from smile vs furrow (descriptor only — **do not label “happy/sad” in UI**)
- `attention` from gazeAway inverse
- `confidence`: face present × agreeing signals × baseline maturity → `low|medium|high`

Downsample to **1 Hz** `SignalFrame` for charts + ingest (keep 12 Hz internal for event engine if needed).

- [ ] **Step 3.5: GATE M2**

Act bored / look away → engagement line visibly falls within a few seconds.

**Phase 3 gate:** Live chart tracks real face behavior; synthetic remains fallback via query flag.

---

### Task 4: Deterministic event engine + auto nudge

**Files:**
- Create: `client/src/perception/eventEngine.ts`
- Modify: `client/src/components/LiveView.tsx`
- Modify: `client/src/components/NudgeToast.tsx`

- [ ] **Step 4.1: Engine rules (client-owned WHEN)**

```ts
// client/src/perception/eventEngine.ts
export type NudgeCandidate = {
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
};

export type EngineState = {
  ewma: number;
  lastNudgeAt: number | null; // session t seconds
  dipStartedAt: number | null;
};

const COOLDOWN_S = 90;
const DIP_Z = -1.5;
const DIP_HOLD_S = 10;

export function considerNudge(
  state: EngineState,
  frame: SignalFrame,
  opts: { userTalkRatio?: number },
): { state: EngineState; candidate: NudgeCandidate | null } {
  // EWMA update; z vs EWMA; hysteresis; cooldown
  // Example candidate evidence:
  // ["engagement below baseline for 12s", "gazeAway elevated", "you've held the floor ~80s"]
  return { state, candidate: null };
}
```

On candidate: call `requestNudge` once; push to session nudges; show toast. Ignore further candidates until cooldown.

- [ ] **Step 4.2: Dev threshold panel** (optional, GATE rehearsal)

Hidden panel or URL params to tune `DIP_Z` / `DIP_HOLD_S` in the demo room. Prefer tuning over fake-fire buttons (BUILD_PLAN).

- [ ] **Step 4.3: Verify GATE M3**

Skit: user monologues → partner disengages → nudge fires once within ~90s → user asks question → line recovers. Second nudge suppressed by cooldown.

**Phase 4 gate:** Auto nudge end-to-end on live or local URL.

---

### Task 5: Web Speech transcript

**Files:**
- Create: `client/src/perception/useSpeech.ts`
- Modify: LiveView / SessionContext

- [ ] **Step 5.1: Hook**

```ts
// webkitSpeechRecognition, continuous: true, interimResults: false
// onend → restart while phase === 'live'
// Map results to TranscriptTurn { speaker: 'user' | 'partner', t, text }
```

Hackathon simplification (acceptable): default `speaker: 'user'` for all turns, or split by WebAudio RMS vs partner `jawOpen` if Task 3 talking signal exists. Debrief metrics use talk ratio when present.

- [ ] **Step 5.2: Chrome-only note**

Demo in real Chrome. If Speech fails, continue signals-only — debrief still works.

**Phase 5 gate:** Ending a session includes non-empty `transcript` in debrief payload when mic works.

---

### Task 6: DEBRIEF view (SSE + timeline)

**Files:**
- Create: `client/src/components/DebriefView.tsx`
- Modify: `client/src/components/TimelineView.tsx`
- Modify: `client/src/components/StatsView.tsx` (embed or rewrite)
- Modify: `client/src/App.tsx`

- [ ] **Step 6.1: End session transition**

Live **End session** button:
1. Stop MediaPipe / speech / ingest intervals
2. Flush remaining frames (`ingestFrames` once)
3. `POST /v1/sessions/:id/end`
4. `setPhase('debrief')`

- [ ] **Step 6.2: Start SSE on mount**

```ts
await streamDebrief(
  {
    sessionId,
    context,
    transcript,
    // Prefer DB frames via sessionId; also pass inline frames if persistence cut
    frames: frames.length ? frames : undefined,
    tier: 'smart',
  },
  {
    onDelta: (text) => setDebrief((d) => d + text),
    onDone: () => setDone(true),
    onError: (m) => setError(m),
  },
  abort.signal,
);
```

UI: typewriter area labeled **“Generated by Claude on DigitalOcean Gradient”**.

- [ ] **Step 6.3: Timeline from real frames**

Replace `sessionEvents` mock for the active session:
- Area/line chart of `engagement` vs `t` (Recharts already in deps)
- Markers at nudge `t` values
- Optional: load `listFrames(sessionId)` if memory cleared

Keep `data/sessions.ts` only for empty-state / offline demo of “past sessions” sidebar (BUILD_PLAN stretch).

- [ ] **Step 6.4: Stats rewrite (no emotion labels)**

Remove `emotions: { warmth, trust, … }` display. Show instead:
- Mean engagement / attention
- Dip count / min engagement time
- Talk ratio if known
- Nudge count

- [ ] **Step 6.5: Verify**

1. End session → debrief streams deltas
2. Network shows `text/event-stream` with `delta` then `done`
3. Chart matches the conversation just held
4. Inference down → canned debrief still appears as one delta + done (server behavior)

**Phase 6 gate:** Demo arc CONSENT → LIVE → DEBRIEF works on one laptop.

---

### Task 7: Polish, fallbacks, deploy smoke

**Files:** assorted UI; `STATUS.md` when done; Privacy FAQ copy sync

- [ ] **Step 7.1: Confidence badges everywhere** a signal is shown
- [ ] **Step 7.2: Track cleanup** on phase change / unmount (fix LiveView camera leak)
- [ ] **Step 7.3: Offline / API failure UX**
  - Nudge failure → show local canned lines (mirror `server` fallbacks) or toast “using backup phrasing”
  - Debrief failure → show short local summary from client-side metrics
  - Keep `sessions.ts` fixtures for sidebar only
- [ ] **Step 7.4: Production smoke**

```bash
npm run build
# deploy / wait for App Platform
curl -s https://wavelength-wxut4.ondigitalocean.app/health
# full UI pass on live URL in Chrome
```

- [ ] **Step 7.5: Update STATUS.md** — “client wired to `/v1`” when Phase 6 gate passes

**Phase 7 gate:** Rehearsal-ready; backup video still recommended.

---

## Verification matrix

| Check | Command / action | Pass |
|---|---|---|
| Shared builds | `npm run build -w shared` | `dist/` types export |
| Client typecheck | `npm run build -w client` | no TS errors on `shared` imports |
| Local API | server `:8080` + Vite proxy | `POST /v1/sessions` 201 |
| Frames | Live 10s | `POST /v1/frames` inserts |
| Nudge | manual or auto | hedged JSON, no emotion nouns |
| Debrief | End session | SSE deltas + done |
| Privacy | DevTools | no video/audio blobs in requests |
| Rate limits | normal demo | under 20 inference/min |
| Live URL | Chrome | full 3-state demo |

---

## Parallelism (team)

```
Peter:  Phase 0 → 1 → 2 → 6 → 7
Dinil:  Phase 3 → 4 (event engine)  [starts after video element contract stable]
Either: Phase 5 (speech) when Live is stable
```

Contract between tracks: LiveView always consumes `SignalFrame` + `onFrame`; MediaPipe and synthetic are interchangeable producers.

---

## Explicit non-goals (this plan)

- `GET /v1/progress` / cross-session history API
- pgvector / similar moments
- Auth
- Mobile layout
- React Router
- Emotion classification models or emotion labels in UI

---

## Spec coverage self-check

| Requirement | Task |
|---|---|
| Consent flow | 1 |
| MediaPipe → signals → engagement | 3 |
| Nudge → server | 2 (manual), 4 (auto) |
| Debrief SSE | 6 |
| Stats / timeline real data | 6 |
| Working increments | Phases 0–7 gates |
| Demo 3 states | 1 + 6 |
| `shared` contract | 0 |
| Offline fallback | 7 + keep `sessions.ts` |

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-07-11-client-backend-wiring.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in-session with checkpoints  

Which approach?
