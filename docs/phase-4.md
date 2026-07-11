# Phase 4 — Harden + Deploy (implementation guide)

> **Audience:** any agent or teammate picking up deploy. Phases 0–4 **code** are on `main`
> (`/v1` + Docker + CI). This doc is how to get a **live** App Platform URL.
>
> Handoff: [agent-handoff.md](./agent-handoff.md) · Status: [STATUS.md](../STATUS.md) ·
> Backend SoT: [backend-plan.md](./backend-plan.md)
>
> **Cursor:** DigitalOcean MCP is configured at `~/.cursor/mcp.json` (user-level, not in git).
> Prefer MCP `digitalocean-apps` / `digitalocean-databases` to create/update the app.

---

## 0. Goal and definition of done

**Goal:** one public HTTPS URL that:

1. Serves the React client (`client/dist`) from Express
2. Exposes `/health`, `/ready`, and `/v1/*` (sessions, frames, nudge, SSE debrief)
3. Holds `DIGITAL_OCEAN_MODEL_ACCESS_KEY` server-side (never in the browser)
4. Uses Managed Postgres (migrations applied automatically on start)
5. Rate-limits inference-heavy routes
6. Has CI that typechecks + runs hermetic server tests on every PR

**Done when:**

| Check | Pass criteria |
|---|---|
| Local | `npm test -w server` + typecheck green; Docker image builds |
| Live | `GET https://<app>/health` → 200; `GET /ready` → 200 |
| API | `POST /v1/sessions` → 201; `POST /v1/nudge` → JSON; `POST /v1/debrief` → SSE |
| UI | `GET https://<app>/` → client `index.html` |
| Docs | STATUS / AGENTS / README show Phase 4 ✅ + live URL |

**Explicitly not blocking Phase 4:** Peter wiring `client/` → `/v1` (MediaPipe LIVE loop).
Ship the shell UI + live API first; wire the client in parallel.

**Never cut:** live nudge (`POST /v1/nudge`) or streaming debrief (`POST /v1/debrief`).

---

## 1. Current baseline (what you start from)

```
client/     React/Vite — builds to client/dist. Not yet calling /v1.
shared/     Zod contracts — build with `npm run build -w shared` (exports → dist/)
server/     Express on :8080 — /health, /ready, /v1/*, rate limits, static SPA
            Dockerfile + entrypoint + .do/app.yaml + CI ✅ on main
            Live App Platform URL ❌ still pending
```

**Env already validated** in [`server/src/config/env.ts`](../server/src/config/env.ts):

| Var | Prod? | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | App Platform sets; default **8080** | |
| `DIGITAL_OCEAN_MODEL_ACCESS_KEY` | **secret, required** for inference | `/ready` fails without it |
| `DATABASE_URL` | **secret, required** for sessions/frames | SSL Managed Postgres URL |
| `CORS_ORIGIN` | app HTTPS origin (+ optional `http://localhost:5173`) | comma-separated |
| `DO_INFERENCE_BASE_URL` | optional | default `https://inference.do-ai.run/v1` |
| `MODEL_FAST` / `MODEL_SMART` | optional | Haiku / Sonnet defaults |
| `CLIENT_DIST` | **add in Phase 4** | absolute path to `client/dist` in the image |
| `MIGRATIONS_DIR` | **add in Phase 4** | absolute path to Drizzle SQL migrations |

Old Python app `wavelength-brain-37j5z.ondigitalocean.app` is **defunct** — create a **new**
App Platform app. Reuse the existing Managed Postgres if schema is already applied.

---

## 2. Architecture of the deployed unit

```
Browser ──HTTPS──► DO App Platform (Docker)
                      │
                      ▼
              Express :8080
              ├── GET  /health, /ready
              ├── /v1/*  (+ rate limits)
              │     └── Gradient client → inference.do-ai.run
              │     └── repos → Managed Postgres
              └── static + SPA → client/dist
```

One container = one deployable. Inference key never reaches the browser.

---

## 3. Implementation order (do in this sequence)

| Step | Work | Est. | Cut under pressure? |
|---|---|---|---|
| A | Rate limit + `trust proxy` | 30–45m | No (cheap) |
| B | Serve `client/dist` + SPA fallback | 45–60m | Soft — can API-only if desperate |
| C | Fix migrate path for Docker | 20–30m | No |
| D | Dockerfile + entrypoint + `.dockerignore` | 1–1.5h | No |
| E | `.do/app.yaml` + deploy + secrets | 45–90m | No |
| F | Live smoke | 20m | No |
| G | GitHub Actions CI | 30–45m | Yes (cut last) |
| H | Docs + STATUS live URL | 15m | No |

---

## 4. Step A — Rate limiting

### Files

- Create [`server/src/http/middleware/rateLimit.ts`](../server/src/http/middleware/rateLimit.ts)
- Edit [`server/src/app.ts`](../server/src/app.ts)
- Dep: `express-rate-limit` (+ types if needed)

### Behavior

```ts
// Pseudocode — implement for real in rateLimit.ts
import rateLimit from 'express-rate-limit';

export const v1Limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const inferenceLimiter = rateLimit({
  windowMs: 60_000,
  max: 20, // nudge + debrief are expensive
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Wire in `createApp()`

1. `app.set('trust proxy', 1)` — App Platform sits behind a proxy; needed for correct IP.
2. Mount `v1Limiter` on the `/v1` router.
3. Mount `inferenceLimiter` on nudge + debrief routers only (before the handlers).

Return the library’s default 429 JSON or map into `AppError` envelope if easy — either is fine
for hackathon.

### Verify

- Hermetic tests still pass.
- Optional: hit `/v1/nudge` in a loop locally and confirm 429 after the cap.

---

## 5. Step B — Serve the client from Express

### Files

- Create [`server/src/http/static.ts`](../server/src/http/static.ts) (or inline in `app.ts` if tiny)
- Extend [`server/src/config/env.ts`](../server/src/config/env.ts) with optional `CLIENT_DIST`
- Edit [`server/src/app.ts`](../server/src/app.ts)

### Middleware order (critical)

```
requestId → pino → cors → json
→ /health,/ready
→ /v1 (rate-limited)
→ express.static(CLIENT_DIST)
→ SPA fallback: GET * → index.html   (skip if path starts with /v1)
→ 404 → errorHandler
```

### Path resolution

In Docker the layout will be something like:

```
/app/
  server/dist/index.js
  client/dist/index.html
```

Set `CLIENT_DIST=/app/client/dist` in App Platform env (or hardcode that default when
`NODE_ENV=production`). Locally:

```bash
npm run build -w client
CLIENT_DIST=../client/dist npm run dev -w server
# or after server build:
CLIENT_DIST=../client/dist node server/dist/index.js
```

### SPA fallback rules

- Only for `GET`/`HEAD`
- Never for `/v1`, `/health`, `/ready`
- If `index.html` missing (API-only image), skip static and let 404 handler run — don’t crash boot

### Verify

```bash
npm run build -w client
CLIENT_DIST="$PWD/client/dist" npm run dev -w server
curl -sI http://localhost:8080/ | head -5   # HTML
curl -s http://localhost:8080/health        # {"ok":true}
```

---

## 6. Step C — Migrations that work in Docker

Today [`server/src/db/migrate.ts`](../server/src/db/migrate.ts) uses a **cwd-relative** path:

```ts
await migrate(getDb(), { migrationsFolder: './src/db/migrations' });
```

That breaks once cwd is `/app/server` and only `dist/` + copied SQL exist.

### Fix

1. Add env `MIGRATIONS_DIR` (optional) to `env.ts`.
2. Resolve folder as:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const folder =
  process.env.MIGRATIONS_DIR ??
  path.join(here, 'migrations'); // after copying SQL next to dist/db/
// or path.join(here, '../../src/db/migrations') for local tsx
```

3. In the Docker image, copy:

```
server/src/db/migrations/  →  /app/server/migrations/
```

and set `MIGRATIONS_DIR=/app/server/migrations`.

4. Ensure `npm run db:migrate -w server` still works locally (tsx from `server/` cwd).

### Entrypoint policy

- Run migrate **then** start the server.
- Fail the container if migrate fails (don’t serve a half-migrated API).
- Single instance for hackathon → no multi-leader migrate lock needed.

---

## 7. Step D — Dockerfile (monorepo)

### Files to create

| File | Role |
|---|---|
| [`Dockerfile`](../Dockerfile) | multi-stage build at **repo root** |
| [`.dockerignore`](../.dockerignore) | keep context small |
| [`server/docker-entrypoint.sh`](../server/docker-entrypoint.sh) | migrate → `node dist/index.js` |

### Suggested multi-stage shape

```dockerfile
# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci

# ---- build ----
FROM deps AS build
COPY . .
# shared exports TS source today — ensure server tsc resolves "shared"
RUN npm run build -w client \
 && npm run build -w server

# ---- runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV CLIENT_DIST=/app/client/dist
ENV MIGRATIONS_DIR=/app/server/migrations

# Production node_modules (or copy from deps and prune)
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci --omit=dev

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY server/src/db/migrations ./server/migrations
COPY shared/src ./shared/src
COPY server/docker-entrypoint.sh ./server/docker-entrypoint.sh
RUN chmod +x ./server/docker-entrypoint.sh

WORKDIR /app/server
EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
```

Adjust if `shared` must be compiled to `dist` instead of shipping `src` (today
`shared/package.json` points `main` at `./src/index.ts` — the **runner** needs either
compiled JS for `shared` or to keep `tsx`/TS resolution. Prefer: **build shared to JS** in
the build stage and point package `main` at `dist` for production, *or* bundle server with
a bundler. Simplest hackathon fix that already typechecks:

- In runner, keep workspace link to `shared/src` and run server with `node --import tsx`
  **only if needed** — better: compile `shared` (`tsc -w shared`) and set exports to `dist`
  for the image.

**Recommended concrete choice for this repo:** in the build stage run `npm run build -w shared`
after pointing `shared` `main`/`types`/`exports` at `./dist/*` for production builds, and
ensure server resolves the workspace package from `dist`. Locally, agents can keep using
source exports if preferred — or always build shared before server.

### `.dockerignore`

```
node_modules
**/node_modules
.git
.env
**/.env
old
context
*.md
!README.md
client/dist
server/dist
shared/dist
```

### Entrypoint

```bash
#!/bin/sh
set -e
cd /app/server
node dist/db/migrate.js   # after migrate.ts is compiled into dist
exec node dist/index.js
```

If migrate stays a tsx script, install `tsx` as a production dep **only for migrate**, or
compile it.

### Local Docker verify

```bash
docker build -t wavelength .
docker run --rm -p 8080:8080 \
  -e DIGITAL_OCEAN_MODEL_ACCESS_KEY \
  -e DATABASE_URL \
  -e CORS_ORIGIN=http://localhost:8080 \
  wavelength
curl -s http://localhost:8080/health
```

---

## 8. Step E — App Platform deploy

### Spec file: `.do/app.yaml`

Create a new app (do **not** revive `wavelength-brain`).

Sketch:

```yaml
name: wavelength
region: nyc
services:
  - name: web
    dockerfile_path: Dockerfile
    github:
      repo: chuckabox/digitalocean   # confirm org/repo
      branch: main
      deploy_on_push: true
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xxs    # bump if OOM on build
    health_check:
      http_path: /health
    envs:
      - key: NODE_ENV
        value: production
      - key: CLIENT_DIST
        value: /app/client/dist
      - key: MIGRATIONS_DIR
        value: /app/server/migrations
      - key: CORS_ORIGIN
        value: ${APP_URL}            # or paste https://….ondigitalocean.app
      - key: DIGITAL_OCEAN_MODEL_ACCESS_KEY
        type: SECRET
        value: EV[…]                 # set in console / doctl
      - key: DATABASE_URL
        type: SECRET
        value: EV[…]                 # or bind database
# Optional: databases: - name: wavelength-db … bind as DATABASE_URL
```

### Secrets checklist (console or `doctl`)

1. `DIGITAL_OCEAN_MODEL_ACCESS_KEY` — Inference → Manage → model access key
2. `DATABASE_URL` — Managed Postgres connection string (`?sslmode=require`)
3. After first deploy, set `CORS_ORIGIN` to the real `https://<app>.ondigitalocean.app`
   (and optionally `http://localhost:5173` while Vite talks to prod)

### Deploy commands

```bash
# validate + create (or update)
doctl apps create --spec .do/app.yaml
# later:
doctl apps update <app-id> --spec .do/app.yaml
doctl apps list
doctl apps logs <app-id> --type=run
```

Or: DO console → Create App → GitHub `main` → Dockerfile at repo root → set env → Deploy.

### Postgres SSL note

Existing [`server/src/db/client.ts`](../server/src/db/client.ts) already uses
`rejectUnauthorized: false` for Managed Postgres — keep that for App Platform.

---

## 9. Step F — Live smoke checklist

Run against the public URL (replace `$APP`):

```bash
APP=https://<your-app>.ondigitalocean.app

curl -s "$APP/health"
# {"ok":true}

curl -s "$APP/ready"
# {"ready":true,"checks":{"inferenceKey":true,"database":true}}

curl -s -X POST "$APP/v1/sessions" -H 'content-type: application/json' \
  -d '{"context":"smoke test"}'
# {"id":"…","createdAt":"…",…}

SID=<uuid from above>
curl -s -X POST "$APP/v1/frames" -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"frames\":[{\"t\":0,\"engagement\":0.8}]}"

curl -s -X POST "$APP/v1/nudge" -H 'content-type: application/json' \
  -d '{"confidence":"medium","evidence":["gaze away 9s","held floor 40s"]}'

curl -sN -X POST "$APP/v1/debrief" -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"transcript\":[],\"frames\":[{\"t\":0,\"engagement\":0.7}]}"
# data: {"type":"delta","text":…}
# data: {"type":"done"}

curl -sI "$APP/" | head -5
# content-type: text/html
```

If inference key is wrong, nudge/debrief should still return **canned** fallbacks (Phase 3) —
demo-safe.

---

## 10. Step G — CI (cuttable)

Create [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run typecheck -w shared
      - run: npm run typecheck -w server
      - run: npm test -w server
```

**Do not** run live DO/DB integration tests in CI (no secrets on PRs). Migrate stays in
container entrypoint.

Optional later: `docker build` on main only (slow; skip under time pressure).

---

## 11. Step H — Docs after green

Update in one pass:

- [STATUS.md](../STATUS.md) — Phase 4 ✅, paste live URL, Dinil next = MediaPipe loop
- [AGENTS.md](../AGENTS.md) — build status + current tree includes Dockerfile / rateLimit / static
- [docs/backend-plan.md](./backend-plan.md) — Phase 4 ✅, link here
- [README.md](../README.md) — status line + live URL

---

## 12. File checklist (create / modify)

### Create

```
server/src/http/middleware/rateLimit.ts
server/src/http/static.ts          # or fold into app.ts
server/docker-entrypoint.sh
Dockerfile                         # repo root
.dockerignore
.do/app.yaml
.github/workflows/ci.yml
docs/phase-4.md                    # this file
```

### Modify

```
server/package.json                # express-rate-limit
server/src/app.ts                  # trust proxy, limiters, static order
server/src/config/env.ts           # CLIENT_DIST, MIGRATIONS_DIR
server/src/db/migrate.ts           # resolvable migrations path
shared/package.json                # if switching exports to dist for Docker
STATUS.md · AGENTS.md · README.md · docs/backend-plan.md
```

---

## 13. Cut order (if the clock is dying)

1. **Keep:** Dockerfile (API+static), App Platform, secrets, migrate-on-start, smoke
2. **Keep:** rate limit (small)
3. **Cut:** GitHub CI
4. **Cut:** fancy `.do/app.yaml` polish — console deploy is enough
5. **Never cut:** `/v1/nudge`, `/v1/debrief`, `/health`

API-only image (skip `client` build in Docker) is an emergency fallback — still set
`CORS_ORIGIN` for Vite → prod API.

---

## 14. Parallel tracks (not Phase 4, but unblock demo)

| Owner | Work |
|---|---|
| **Peter** | Wire `client/` to `/v1` (sessions, frames, nudge, SSE debrief); keep `sessions.ts` offline fallback |
| **Dinil** | After deploy: MediaPipe LIVE loop → frames + nudge |
| **Connor** | Tear down defunct `wavelength-brain`; pitch uses new URL |

Same-origin after SPA serve means the client can use relative `/v1/...` with no CORS pain.

---

## 15. Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `/ready` 503 | missing inference key | set App Platform secret |
| sessions 500 | missing/invalid `DATABASE_URL` or SSL | paste Managed Postgres URL with `sslmode=require` |
| CORS browser errors | `CORS_ORIGIN` still localhost-only | add app HTTPS origin |
| migrate fails in container | wrong `MIGRATIONS_DIR` | copy SQL into image; set env |
| shared import fails in runner | TS source not resolvable by `node` | build `shared` to `dist` or bundle |
| 429 in demo | rate limit too tight | raise nudge/debrief max for venue |
| blank `/` | client not copied / wrong `CLIENT_DIST` | verify image paths |

---

## 16. Suggested commit sequence

1. `feat(server): rate-limit /v1 and trust proxy`
2. `feat(server): serve client dist with SPA fallback`
3. `fix(server): resolve migrations path for Docker`
4. `chore: Dockerfile + entrypoint + app spec + CI`
5. `docs: Phase 4 complete + live URL`

Push to `main` (or PR → merge) so App Platform `deploy_on_push` fires.

---

## 17. Deploy (manual or MCP)

Prefer **DigitalOcean MCP** in Cursor (`digitalocean-apps`, `digitalocean-databases`) when
available — see [agent-handoff.md](./agent-handoff.md).

```bash
# Option A: MCP — list_apps / create_app / update from .do/app.yaml + set secrets
# Option B: DO console — Create App → GitHub main → Dockerfile at repo root → set secrets
# Option C:
doctl apps create --spec .do/app.yaml
# then set SECRET env: DIGITAL_OCEAN_MODEL_ACCESS_KEY, DATABASE_URL
# set CORS_ORIGIN to https://<app>.ondigitalocean.app
```

After first deploy + smoke, paste the live URL into [STATUS.md](../STATUS.md).

**Do not** reuse or resurrect `wavelength-brain-37j5z` (defunct Python app).