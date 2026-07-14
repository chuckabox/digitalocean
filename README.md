# Wavelength

Wavelength is a consented social co-pilot for reading social cues in real conversations. It gives
you discreet, gentle nudges in the moment and an annotated debrief afterward. We built it first for
neurodivergent people who find it hard to read how someone else is feeling during a live
conversation. It suggests, it never diagnoses, and every read comes with a confidence level.

**Live:** https://wavelength-wxut4.ondigitalocean.app

## What it does

During a one-on-one conversation where both people have agreed to it, Wavelength watches the
partner's facial and attentional signals and tracks how they change as the conversation goes on. It
never treats a single moment as a verdict. What matters is the trajectory, how those signals move
over time.

**Live nudges, in the moment.** Wavelength only speaks up on a meaningful shift, never
continuously. Each nudge is a gentle, actionable suggestion for you ("they seem to be drifting,
maybe ask a question"), it carries a confidence level, and it is easy to ignore. It arrives
discreetly so the conversation is not interrupted.

**The debrief, afterward.** The conversation replays as an annotated emotional timeline, with a
plain-language summary of what happened and a few kind, concrete things to try next time.

### What we believe

- **Suggest, never diagnose.** Everything is a hedged possibility with a confidence level attached.
- **Consent first.** Wavelength only runs when everyone involved has agreed. Consent is explicit,
  visible, and can be revoked at any time.
- **A translator, not a cure.** This is an accommodation, closer to captions for the
  social-emotional channel than a tool to "fix" anyone.

The full product vision lives in [docs/vision.md](./docs/vision.md).

## Tech stack

Wavelength runs on DigitalOcean and uses Gradient AI for the conversational reasoning layer.

- **Client:** React 19, Vite, and Tailwind CSS, with MediaPipe Tasks Vision for in-browser facial
  landmark tracking, Recharts for the timeline, and Framer Motion for animation.
- **Server:** Express 5, Drizzle ORM over PostgreSQL, an OpenAI-compatible client wired to
  DigitalOcean Gradient AI, Zod-validated APIs, and Pino logging.
- **Shared:** a common TypeScript types and schema workspace.
- **Hosting:** DigitalOcean App Platform with managed PostgreSQL.

It is a monorepo built with npm workspaces: [`client/`](./client), [`server/`](./server), and
[`shared/`](./shared).

## Getting started

```bash
npm install
npm run dev        # runs the client and server together
```

Other useful scripts:

```bash
npm run build      # build shared, client, and server
npm run typecheck  # typecheck shared and server
npm run test       # run the test suites
```

## Project docs

- Product vision: [docs/vision.md](./docs/vision.md)
- Team status: [STATUS.md](./STATUS.md)
- Backend plan: [docs/backend-plan.md](./docs/backend-plan.md)
- DigitalOcean reference, including MCP: [docs/digitalocean.md](./docs/digitalocean.md)
- Agent instructions: [AGENTS.md](./AGENTS.md)
