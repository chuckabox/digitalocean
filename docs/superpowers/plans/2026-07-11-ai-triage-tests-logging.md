# AI Triage Kit — Tests & Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In ~60–90 minutes, add just enough structured logging and hermetic tests that an AI (or human) can diagnose demo failures from logs and that CI catches broken session/nudge paths.

**Architecture:** Keep existing Pino + Vitest. Add warn/info logs on AppErrors, Gradient calls, and canned fallbacks. Extend hermetic route tests for missing session endpoints. Add one client Vitest suite for pure `eventEngine` (no DOM). No integration-in-CI, no React/MediaPipe tests, no client structured logger.

**Tech Stack:** Pino (server), Vitest + Supertest (server), Vitest (client, new), existing Express `/v1` layering.

**Time budget:** Hard stop at ~90 min. If behind, cut Task 5 (client tests) first, then Task 3 (Gradient latency logs).

---

## File map

| File | Role |
|------|------|
| `server/src/http/middleware/errorHandler.ts` | Log AppError / Zod 4xx–5xx with code + requestId |
| `server/src/services/nudge.ts` | Warn when falling back to canned nudge |
| `server/src/services/debrief.ts` | Warn when falling back to canned debrief |
| `server/src/clients/gradient.ts` | Info/warn around chat/stream/structured (tier, model, ms; never prompts/keys) |
| `server/src/v1.routes.test.ts` | GET session, end session, GET frames, 404s |
| `server/src/services/nudge.test.ts` | Optional: assert fallback still works (already covered; only touch if logger needs spy) |
| `client/src/perception/eventEngine.test.ts` | Pure unit tests for `considerNudge` |
| `client/package.json` | Add `vitest` + `test` script |
| `client/vitest.config.ts` | Node env, include `src/**/*.test.ts` |
| `package.json` (root) | `test` runs shared build + server + client tests |

**Explicitly out of scope:** shared contract suite, React component tests, MediaPipe E2E, rate-limit/CORS unit suites, `db/migrate` tests, client logger module, APM/tracing.

---

### Task 1: Log expected API errors (sticky note on the door)

**Files:**
- Modify: `server/src/http/middleware/errorHandler.ts`

- [ ] **Step 1: Update errorHandler to warn on AppError/Zod (keep error on unhandled)**

Replace the handler body so expected failures are visible in App Platform logs:

```ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorEnvelope } from '../../errors.js';
import { logger } from '../../logger.js';

/** Terminal error handler — turns anything thrown into a consistent envelope. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let appErr: AppError;

  if (err instanceof AppError) {
    appErr = err;
  } else if (err instanceof ZodError) {
    appErr = AppError.validation('Request validation failed', err.issues);
  } else {
    appErr = new AppError('internal_error', 500, 'Internal server error');
    logger.error({ err, requestId: req.id }, 'Unhandled error');
  }

  if (appErr.code !== 'internal_error') {
    logger.warn(
      {
        requestId: req.id,
        code: appErr.code,
        status: appErr.statusCode,
        path: req.path,
        method: req.method,
        message: appErr.message,
      },
      'Request failed',
    );
  }

  const envelope: ErrorEnvelope = {
    error: {
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details !== undefined ? { details: appErr.details } : {}),
      requestId: String(req.id),
    },
  };
  res.status(appErr.statusCode).json(envelope);
}
```

- [ ] **Step 2: Sanity-check existing hermetic tests still pass**

Run: `npm test -w server`

Expected: PASS (behavior unchanged; only logging added).

- [ ] **Step 3: Commit** (only if user asked to commit; otherwise skip)

```bash
git add server/src/http/middleware/errorHandler.ts
git commit -m "$(cat <<'EOF'
log AppError responses for AI triage

EOF
)"
```

---

### Task 2: Log canned fallbacks (sticky note on the espresso machine)

**Files:**
- Modify: `server/src/services/nudge.ts`
- Modify: `server/src/services/debrief.ts`

- [ ] **Step 1: Import logger and warn on nudge fallback**

In `nudge.ts`, add:

```ts
import { logger } from '../logger.js';
```

In the `catch` block when `upstream_error`:

```ts
  } catch (err) {
    if (err instanceof AppError && err.code === 'upstream_error') {
      logger.warn(
        { code: err.code, message: err.message, confidence: req.confidence },
        'Nudge falling back to canned copy',
      );
      return cannedNudge(req.confidence, req.evidence);
    }
    throw err;
  }
```

- [ ] **Step 2: Same for debrief**

In `debrief.ts`, add logger import. In the `catch` when `upstream_error`:

```ts
  } catch (err) {
    if (err instanceof AppError && err.code === 'upstream_error') {
      logger.warn(
        { code: err.code, message: err.message, tier },
        'Debrief falling back to canned copy',
      );
      yield cannedDebrief(metrics, req.context);
      return;
    }
    throw err;
  }
```

- [ ] **Step 3: Run service tests**

Run: `npm test -w server -- src/services/nudge.test.ts src/services/debrief.test.ts`

Expected: PASS (fallback behavior unchanged).

---

### Task 3: Log Gradient calls (sticky note on the machine itself)

**Files:**
- Modify: `server/src/clients/gradient.ts`

- [ ] **Step 1: Add logger + thin timing helper at top of file (after imports)**

```ts
import { logger } from '../logger.js';

async function withInferenceLog<T>(
  op: string,
  tier: ModelTier,
  fn: () => Promise<T>,
): Promise<T> {
  const model = modelFor(tier);
  const started = Date.now();
  try {
    const result = await fn();
    logger.info(
      { op, tier, model, ms: Date.now() - started },
      'Gradient ok',
    );
    return result;
  } catch (err) {
    logger.warn(
      {
        op,
        tier,
        model,
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : String(err),
      },
      'Gradient failed',
    );
    throw err;
  }
}
```

**Rules:** Never log `prompt`, `messages`, `system`, API keys, or raw tool arguments.

- [ ] **Step 2: Wrap `chat` body**

```ts
export async function chat(opts: ChatOptions): Promise<string> {
  const tier = opts.tier ?? 'fast';
  return withInferenceLog('chat', tier, async () => {
    const res = await client().chat.completions.create(
      {
        model: modelFor(tier),
        messages: buildMessages(opts),
        max_completion_tokens: opts.maxTokens ?? 512,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
      reqOpts(opts),
    );
    return res.choices[0]?.message?.content ?? '';
  });
}
```

- [ ] **Step 3: Wrap `structured` (log once around the whole call, not each repair attempt)**

```ts
export async function structured<T>(schema: z.ZodType<T>, opts: StructuredOptions): Promise<T> {
  const tier = opts.tier ?? 'fast';
  return withInferenceLog('structured', tier, async () => {
    const model = modelFor(tier);
    // ... existing attempt / extractValidJson body unchanged ...
    return extractValidJson(schema, attempt, opts.maxAttempts ?? 2);
  });
}
```

- [ ] **Step 4: Wrap `stream` carefully**

Log start at info; on throw, warn; on successful generator exhaustion, info with ms.

Minimal pattern — log failure when create throws; for successful streams, log ok when the generator finishes (optional). Prefer:

```ts
export async function* stream(opts: ChatOptions): AsyncGenerator<string> {
  const tier = opts.tier ?? 'smart';
  const model = modelFor(tier);
  const started = Date.now();
  let s;
  try {
    s = await client().chat.completions.create(
      {
        model,
        messages: buildMessages(opts),
        max_completion_tokens: opts.maxTokens ?? 1024,
        stream: true,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
      reqOpts(opts),
    );
  } catch (err) {
    logger.warn(
      {
        op: 'stream',
        tier,
        model,
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : String(err),
      },
      'Gradient failed',
    );
    throw err;
  }
  try {
    for await (const chunk of s) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
    logger.info(
      { op: 'stream', tier, model, ms: Date.now() - started },
      'Gradient ok',
    );
  } catch (err) {
    logger.warn(
      {
        op: 'stream',
        tier,
        model,
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : String(err),
      },
      'Gradient failed',
    );
    throw err;
  }
}
```

- [ ] **Step 5: Run hermetic gradient + service tests**

Run: `npm test -w server`

Expected: PASS.

---

### Task 4: Fill missing `/v1` session/frame route tests

**Files:**
- Modify: `server/src/v1.routes.test.ts`

- [ ] **Step 1: Wire `endSession` and `getFrames` mocks**

After existing mocks:

```ts
const endSessionMock = vi.mocked(sessionsRepo.endSession);
const getFramesMock = vi.mocked(framesRepo.getFrames);
```

(`endSession` / `getFrames` are already in `vi.mock` factories.)

- [ ] **Step 2: Add tests inside `describe('/v1 routes (hermetic)')`**

```ts
  it('GET /v1/sessions/:id returns session', async () => {
    getSessionMock.mockResolvedValueOnce({
      id: sessionId,
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      endedAt: null,
      context: 'friend catch-up',
    });
    const res = await request(app).get(`/v1/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sessionId);
    expect(res.body.createdAt).toBe('2026-07-12T00:00:00.000Z');
  });

  it('GET /v1/sessions/:id -> 404 when missing', async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await request(app).get(`/v1/sessions/${sessionId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('POST /v1/sessions/:id/end ends session', async () => {
    endSessionMock.mockResolvedValueOnce({
      id: sessionId,
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      endedAt: new Date('2026-07-12T00:10:00.000Z'),
      context: null,
    });
    const res = await request(app).post(`/v1/sessions/${sessionId}/end`);
    expect(res.status).toBe(200);
    expect(res.body.endedAt).toBe('2026-07-12T00:10:00.000Z');
  });

  it('POST /v1/sessions/:id/end -> 404 when missing', async () => {
    endSessionMock.mockResolvedValueOnce(null);
    const res = await request(app).post(`/v1/sessions/${sessionId}/end`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('GET /v1/sessions/:id/frames returns frames', async () => {
    getSessionMock.mockResolvedValueOnce({
      id: sessionId,
      createdAt: new Date(),
      endedAt: null,
      context: null,
    });
    getFramesMock.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        sessionId,
        t: 1.5,
        engagement: 0.7,
        valence: null,
        attention: 0.6,
        signals: null,
        confidence: 'medium',
        createdAt: new Date(),
      },
    ]);
    const res = await request(app).get(`/v1/sessions/${sessionId}/frames`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].t).toBe(1.5);
    expect(res.body[0].engagement).toBe(0.7);
  });

  it('GET /v1/sessions/:id/frames -> 404 when session missing', async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await request(app).get(`/v1/sessions/${sessionId}/frames`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('POST /v1/frames -> 404 when session missing', async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/v1/frames')
      .send({ sessionId, frames: [{ t: 0, engagement: 0.5 }] });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
```

If frame response shape differs, read `server/src/http/routes/frames.ts` + `mappers.ts` and assert against the real mapper output (adjust expectations; do not change production mappers to fit tests).

- [ ] **Step 3: Run route tests**

Run: `npm test -w server -- src/v1.routes.test.ts`

Expected: all new tests PASS.

---

### Task 5: Client `eventEngine` smoke tests (cut first if short on time)

**Files:**
- Create: `client/vitest.config.ts`
- Create: `client/src/perception/eventEngine.test.ts`
- Modify: `client/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Add vitest to client**

From repo root:

```bash
npm install -D vitest@^2.1.8 -w client
```

- [ ] **Step 2: Create `client/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add scripts**

In `client/package.json` scripts:

```json
"test": "vitest run"
```

In root `package.json` scripts, change `test` to:

```json
"test": "npm run build -w shared && npm test -w server && npm test -w client"
```

- [ ] **Step 4: Write `eventEngine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { considerNudge, createEngineState } from './eventEngine.js';

describe('considerNudge', () => {
  it('does not nudge on first frames while baseline forms', () => {
    let state = createEngineState();
    for (let t = 0; t < 5; t++) {
      const out = considerNudge(state, { t, engagement: 0.8 }, {
        cooldownS: 1,
        dipHoldS: 2,
        dipZ: -1.5,
      });
      state = out.state;
      expect(out.candidate).toBeNull();
    }
  });

  it('emits a candidate after a sustained engagement dip', () => {
    let state = createEngineState();
    const opts = { cooldownS: 1, dipHoldS: 3, dipZ: -1.0 };

    // Establish high baseline
    for (let t = 0; t < 20; t++) {
      const out = considerNudge(state, { t, engagement: 0.9 }, opts);
      state = out.state;
    }

    // Plunge and hold
    let candidate = null;
    for (let t = 20; t < 40; t++) {
      const out = considerNudge(state, { t, engagement: 0.1 }, opts);
      state = out.state;
      if (out.candidate) {
        candidate = out.candidate;
        break;
      }
    }

    expect(candidate).not.toBeNull();
    expect(candidate!.evidence.length).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(candidate!.confidence);
  });

  it('respects cooldown after a nudge', () => {
    let state = createEngineState();
    const opts = { cooldownS: 30, dipHoldS: 2, dipZ: -1.0 };

    for (let t = 0; t < 15; t++) {
      state = considerNudge(state, { t, engagement: 0.9 }, opts).state;
    }

    let firstAt: number | null = null;
    for (let t = 15; t < 50; t++) {
      const out = considerNudge(state, { t, engagement: 0.05 }, opts);
      state = out.state;
      if (out.candidate && firstAt == null) firstAt = t;
      if (firstAt != null && t > firstAt && t < firstAt + 30) {
        expect(out.candidate).toBeNull();
      }
    }
    expect(firstAt).not.toBeNull();
  });
});
```

If the dip thresholds need slight tuning for the second test to fire, adjust **test opts only** (lower `dipZ` / `dipHoldS`), not production defaults.

- [ ] **Step 5: Run client + full root tests**

Run:

```bash
npm test -w client
npm test
```

Expected: PASS.

---

### Task 6: Verify + handoff note

- [ ] **Step 1: Full hermetic gate**

```bash
npm run typecheck -w server
npm test
```

Expected: typecheck clean; all tests green.

- [ ] **Step 2: One-line STATUS note (optional, only if editing STATUS anyway)**

Under Known risks or Backend status, add:

> AI triage kit (2026-07-11): AppError + Gradient + canned-fallback logs; hermetic session/frame route tests; client `eventEngine` unit tests.

- [ ] **Step 3: How to use when something breaks**

1. App Platform runtime logs → search `Nudge falling back`, `Debrief falling back`, `Gradient failed`, `Request failed`.
2. Local: reproduce with `npm test`; if inference-related, check `DIGITAL_OCEAN_MODEL_ACCESS_KEY` and live `/ready`.
3. Do **not** paste secrets from logs (redaction covers key/URL; still avoid sharing full env).

---

## Self-review

| Spec item | Task |
|-----------|------|
| Log AppErrors | Task 1 |
| Log canned fallbacks | Task 2 |
| Log Gradient tier/ms/fail | Task 3 |
| Missing session/frame route tests | Task 4 |
| eventEngine client tests | Task 5 |
| Keep CI hermetic; no secrets | Tasks 4–6; no integration in CI |
| Cut order if late | Drop Task 5, then Task 3 latency polish |

No placeholders. No React/MediaPipe/shared-contract scope creep.
