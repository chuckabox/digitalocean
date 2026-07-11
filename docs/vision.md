# Wavelength — Product Vision

> The "why" and "what", not the "how". For the build plan (architecture, schedule,
> demo), see [BUILD_PLAN.md](../BUILD_PLAN.md). The only fixed constraint is the
> platform: it runs on DigitalOcean.

---

## Only requirement

- **It runs on DigitalOcean.** MCP access to DigitalOcean is already set up.
- No other constraints. Any approach, structure, or set of building blocks is fair game as long as it lives on DigitalOcean.

---

## One-line pitch

A consented "social co-pilot" that helps neurodivergent people read social cues in real conversations — nudging gently in the moment, and explaining clearly afterward.

---

## The problem

Many neurodivergent people (including autistic people, people with ADHD, and others) find real-time social cues hard to read: whether someone is interested or bored, warming up or pulling away, comfortable or overwhelmed, joking or serious. These signals move fast, stack on top of each other, and are easy to miss while also trying to listen, respond, and manage one's own expression. Missing them isn't a lack of intelligence or care — it's a different way of processing social information — but the cost is real: conversations stall, relationships strain, and people are misjudged. Existing tools tend to teach cues from cartoons or flashcards, which don't transfer well to live faces, or they claim to "detect emotions" with a confidence the science doesn't support.

## Who it's for

- **Primary:** neurodivergent people who want live support and honest feedback in one-on-one conversations — not a lesson, a co-pilot.
- **Also serves:** the conversation partner, because the tool can help *both* sides understand each other, not just one.
- **Adjacent uses:** coaching, social-skills practice, self-reflection, and helping neurotypical people notice when *they* are being unclear.

---

## The core idea

During a one-on-one conversation where **both people have agreed to it**, the tool watches the partner's facial and attentional signals and tracks how they change over the course of the conversation. When something *meaningful* shifts, it sends the user a discreet, hedged nudge — a suggestion, never a verdict. Afterward, it replays the whole conversation as an annotated emotional timeline with a plain-language debrief of what happened and what to try next. It never claims certainty; every read carries a confidence level. And it is framed as a **two-way translator**, not a tool to "fix" the user.

The raw essence, in five sentences:

1. A consented social co-pilot that helps neurodivergent people read social cues during a one-on-one conversation.
2. It watches the conversation partner — who has agreed to it — and tracks their signals (engagement, emotion, attention) over the conversation.
3. When something meaningful shifts, it sends the user a discreet, hedged nudge like "engagement dropped — maybe ask a question."
4. Afterward it replays an annotated emotional timeline of the conversation with a plain-English debrief.
5. It never asserts verdicts — every read carries a confidence level — and it is framed as a two-way translator, not a tool to "fix" the user.

---

## How it works (the experience)

### 1. Setup & consent
Both people acknowledge the session is on. Consent is explicit and visible — this is a feature, not fine print. The user chooses light context up front (who they're talking to, what they hope for from the conversation) so guidance can be relevant rather than generic.

### 2. What it watches
Over the conversation it attends to observable, describable signals rather than snap emotional labels — things a thoughtful friend might notice: where attention is going, whether someone is leaning in or drifting, shifts in expression, signs of comfort, confusion, or overwhelm. Crucially, it treats a single moment as nearly meaningless; the value is in the **trajectory** — how signals move and change over time.

### 3. Live nudges (in the moment)
- Nudges fire **only on meaningful shifts**, never continuously. A constant stream would be noise, and creepy; the point is to surface the few moments that matter.
- Each nudge is a **gentle, actionable suggestion to the user** ("they seem to be drifting — maybe ask a question"), never a claim about the other person ("they are bored").
- Every nudge carries a **confidence level** and is easy to ignore. The user always holds the final read.
- Delivery is **discreet and private** to the user, so the conversation isn't interrupted.

### 4. The debrief (afterward)
- The full conversation replays as an **annotated emotional timeline**: the arc of engagement and mood, with meaningful moments marked ("around here, attention dropped after a long stretch of talking").
- A **plain-language summary** explains what happened and offers a few concrete, kind suggestions to try next time.
- Over repeated use, the tool can help the user recognize their own patterns and, gently, patterns in the people they talk with.

---

## Design principles (non-negotiable)

- **Suggest, never diagnose.** No verdicts about anyone's inner state. Everything is a hedged possibility with a confidence level.
- **Humility is the product.** Reading faces is genuinely uncertain and unreliable across people and cultures; the design leans into that honesty rather than hiding it. Being trustworthy beats being impressive.
- **Consent-first.** The tool only operates when everyone involved has agreed. Consent is explicit, visible, and revocable.
- **Privacy by default.** Treat faces and conversations as sensitive. Keep as little as possible, for as long as necessary, and be transparent about what is kept.
- **A translator, not a cure.** It does not treat neurodivergence as a defect to correct. It's an accommodation — like captions — that helps people meet in the middle.
- **Two-way by design.** It can help both people understand each other, and can help anyone notice when *they* are being unclear.
- **The user is in charge.** Guidance is optional, ignorable, and never overrides the person's own judgment.

---

## Why it's social good

It targets a real, everyday barrier for a large group of people, and it does so in a way that respects them: it doesn't ask neurodivergent people to mask or perform normalcy, it gives them information and agency. By making social signals more legible *and* by helping both sides understand each other, it reduces misjudgment and friction in the moments where relationships are actually built — job interviews, first meetings, difficult conversations, everyday connection.

---

## The demo vision

A short, honest, live moment that shows the loop close: two people have a real, consented conversation; as one drifts or engages, a discreet nudge reaches the other a beat later and visibly changes what they do next; then the conversation ends and the timeline replays with an annotated arc and a warm, plain-language debrief. The memorable beat is simple — *a gentle nudge helped a real human connect better in real time* — paired with an emotional timeline that makes the invisible visible.

---

## What "good" looks like

- Nudges feel **timely, rare, and helpful** — not spammy, not obvious, not wrong in ways that mislead.
- The debrief tells the user something **true and useful** they can act on.
- Users feel **more capable and more in control**, never surveilled or corrected.
- Both people leave a conversation feeling **better understood**.

---

## Explicitly NOT

- Not a lie detector, a diagnosis, or a claim to know anyone's true feelings.
- Not a tool that operates on people without their knowledge or consent.
- Not a "fix the neurodivergent person" trainer.
- Not a constant stream of interruptions.
- Not dependent on any particular implementation, language, or framework — only on running on DigitalOcean.

---

## Open questions (to resolve later, not now)

- How to keep live nudges timely without becoming noisy or intrusive.
- How to communicate uncertainty so it's honest but still useful in the moment.
- Where the line is between helpful memory (recognizing patterns over time) and storing too much.
- How much context the user should give up front vs. how much is inferred.
- How to handle the partner's experience and agency, not just the user's.
