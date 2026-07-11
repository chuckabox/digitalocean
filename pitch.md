# Wavelength — Conversation Debrief for Neurodivergent Networking

> Living context doc for our final idea. Everything the team needs for the build and the
> 2-minute judge pitch goes here. Status: **name locked (Wavelength), mode locked
> (post-conversation debrief; live nudges = roadmap), modality locked (audio core + video
> supporting layer). Branch-per-person workflow, merge before demo. See ALIGNMENT.md.**

## One-liner
A conversation coach for neurodivergent people who want to get better at networking. You have a
conversation, then afterward the tool debriefs it with you: what happened, where it went sideways
and why, and what to try next time. It teaches the reasoning so the skill sticks.

## Origin story (this is our "why us", lead the pitch with it)
On our UQIES trip, someone we were travelling with really struggled to connect with people. One
moment stuck with us: a few lines into a conversation with a stranger, they disclosed that they're
autistic. It was true and honest, but the timing landed wrong and the room went dead silent. They
didn't get why, and no one told them.

That is the exact gap this tool fills. Not "you're broken," but "here is what happened in that
moment, here is *why* it landed the way it did, and here is what you could try next time." We have
autistic friends and we watched this happen in person. That is the story judges remember, and it
is real.

## The problem (Social Good)
Networking and casual conversation run on unwritten rules: how much to disclose and when, how to
read when someone's interest shifts, how to balance talking and asking. Many neurodivergent people
find these rules invisible in the moment. Existing help is expensive human coaching or generic
apps that don't work on real, messy conversations. Nobody gives you honest, specific feedback on a
conversation you actually had.

Why this scores where SynthForensics didn't: **the social good is showable and personal**, and it
survives Q&A because the value is obvious.

## Product mode: post-conversation debrief (LOCKED)
We are **not** doing real-time coaching. Deliberate decision:
- Real-time feedback would split the user's attention between the person they're talking to and
  the agent, which defeats the purpose (they're already working hard to follow one voice).
- Post-conversation removes the cloud-inference latency pressure entirely.
- It also sidesteps in-the-moment consent and distraction problems.

The user records or role-plays a conversation, then sits down with the debrief afterward.

## Target user + framing guardrails
Primary user: a neurodivergent adult who wants to get better at networking and casual conversation
on their own terms. Not a clinical or diagnostic tool.

Guardrails (self-advocacy community and social-good judges care about these):
- **Agency, not correction.** Offers interpretations and options, never "you did this wrong."
- **Explicit and concrete, not vague.** Many neurodivergent users prefer direct, literal feedback
  over softened social hints. The coach should say plainly "disclosing you're autistic 90 seconds
  in, before rapport was built, is likely why it went quiet," not "hmm, maybe consider timing."
  This is a design principle, not just tone.
- **"Nothing about us without us."** Built with community input. Our autistic friends are our
  first testers and our answer to "why you?"

## What the debrief actually gives the user
A timestamped walkthrough of the conversation with coachable moments flagged. Likely components:
- **Timeline** of the conversation with key moments marked.
- **What worked / what to try differently**, specific and concrete.
- **Coachable patterns**: disclosure timing, question-to-statement ratio, turn-taking balance
  (did you dominate or go quiet?), topic transitions, self-focus vs. interest in the other person.
- **The redo**: "here's how that moment could have gone" with a concrete alternative line.
- **Reaction read** (if video is in scope): where the other person's engagement visibly shifted.

## How it works (pipeline, record-then-analyze)
1. **Capture** — a conversation is recorded (see Open Question 2 on how). Audio is the backbone;
   video is an optional enhancement layer (see Open Question 1).
2. **Transcribe + separate speakers** — turn the recording into a speaker-labelled transcript
   (who said what, and when). Speaker separation is needed for turn-taking / ratio metrics.
3. **Signal extraction:**
   - *Audio/content (core):* the transcript, timing, pauses, turn-taking, and word choice.
   - *Vision (optional):* sampled frames read for the other person's engagement shifts.
4. **Reasoning (the core, on DO):** a **DO reasoning model** analyzes the full conversation and
   produces the structured debrief above, with reasoning and explicit uncertainty. This is the
   part that is not one prompt: it's structured analysis over a full multimodal timeline.
5. **Delivery** — the debrief UI (timeline + flagged moments + redos), optionally spoken via DO /
   fal text-to-speech.
6. **Longitudinal memory (Best Use of Data):** store each session's patterns in **DO Managed
   Postgres + pgvector** so the tool tracks *this* user's recurring habits across conversations
   and shows progress over time ("this is the third time early disclosure came up"). Networking is
   a repeated-practice skill, so the longitudinal angle is the real product, not a bolt-on.

## DigitalOcean tech mapping (Know the Audience)
Judges are DO reps. Every layer rides on their platform:
- **DO Inference — reasoning model:** the debrief analysis (the headline).
- **DO Inference — vision:** optional engagement-shift reading from sampled frames.
- **DO Inference / fal — text-to-speech:** spoken debrief.
- **DO Managed Postgres + pgvector:** longitudinal pattern memory / Best Use of Data.
- **DO Spaces:** store the recording (with a clear retention/deletion story).
- **DO App Platform:** deploy from GitHub, live URL for the demo.
- **Multi-model flex (optional demo beat):** live-swap the reasoning model (Llama to Claude) and
  show the debrief get sharper. One line of code on their platform, exactly the "novel DO use"
  message.

## Defensibility (read before pitching)
You cannot reliably read a specific emotion off a face; the "one expression = one emotion" idea is
contested. So we never output verdicts about internal emotion. We surface **observable signals + a
probabilistic interpretation + the reasoning + explicit uncertainty.** Anchoring the core in
conversation *content and timing* (which is concrete and defensible) rather than facial
emotion-reading is deliberate. Video, if used, reads *engagement shifts* ("she started giving
one-word answers"), not mind-states.

## How it demos (Entertaining Demo)
Reenact the origin story. We show a short, deliberately awkward recorded conversation (including
the mistimed-disclosure "dead silence" beat), then run the debrief live: the tool walks the moment,
explains why it landed flat, and offers the redo. Emotionally resonant, legible in under a minute,
and true. Optional closing beat: invite a judge to record a 20-second chat and debrief it live.
Backup: the pre-recorded conversation always works even if live capture is flaky.

## Scoring against the 5 judged criteria
| Criterion | Read |
|---|---|
| Novelty (DO use) | Strong — multimodal debrief across DO models + pgvector memory. |
| Technical Complexity | Strong — transcription, diarization, temporal reasoning, longitudinal memory. Not one prompt. |
| Social Good | Strong AND demoable, anchored in a real person we know. Our edge over SynthForensics. |
| Entertaining Demo | Strong — reenacted origin story + live debrief + optional judge participation. |
| Know the Audience | Strong — every layer is DO, with a multi-model flex. |

## Open questions for architecture (see chat — these block Dinil's design)
1. **Audio-only v1, or audio + video?** The origin story is about *what was said and when*
   (verbal). Recommend audio/transcript as the core and video as an optional secondary layer, so
   the shakiest tech (facial reading) isn't load-bearing.
2. **Capture method:** live role-play recorded on a laptop/phone, upload an existing recording, or
   real-world capture at an event (consent-heavy)? Recommend record-a-practice-or-real-convo then
   upload/analyze.
3. **Single-session debrief only, or longitudinal progress tracking in the demo?** The pgvector
   memory is the Best Use of Data story; decide if it ships in the demo or is a stretch.
4. **Speaker separation (diarization):** needed for turn-taking/ratio metrics. Confirm it's in
   scope and pick the tool (client-side, a DO model, or a library).
5. **Transcription path:** confirm whether DO Inference takes audio input, or transcription runs
   elsewhere (e.g. Whisper / browser) and only text goes to DO. Keep load-bearing DO work in the
   reasoning + memory layers regardless.
6. **Recording privacy:** where stored (Spaces?), retention, deletion. Sensitive personal convos.
7. **Name.** Candidates: Cue, Subtext, Debrief, Recap, Read the Room, Signal, Second Take.

## Risks + mitigations
- **Emotion-reading validity** → content/timing core, honest-signals framing, never a verdict.
- **Live capture flaky on stage** → pre-recorded reenacted conversation is the primary demo.
- **Condescension / framing** → agency-first, explicit-and-concrete, community-informed.
- **Consent** → willing demo participants; ephemeral/deletable recordings in the product story.
- **Scope creep** → audio-first; video, TTS, and longitudinal memory are layers we add if time.

## Prize-target fit
- **Best UI/UX:** the debrief interface (timeline + flagged moments + redos) is the whole product.
- **Best Use of Data:** the pgvector longitudinal memory. Keep it real, not bolted on.
