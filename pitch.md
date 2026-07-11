# Pitch — Social Cue Interpreter (working title)

> Living context doc for our final idea. Everything the team needs for the build and the
> 2-minute judge pitch goes here. Status: **idea locked, framing + scope being nailed down.**

## One-liner
An assistive tool that watches a conversation (video + audio) and helps neurodivergent users
read the social signals other people take for granted, then explains the *reasoning* behind
each read so the user learns to spot it themselves.

## The problem (Social Good)
Many autistic and otherwise neurodivergent people find non-verbal social signals hard to read in
real time: facial expression, posture, tone of voice, the shift when someone loses interest or
gets uncomfortable. That gap causes real daily friction: missed cues in interviews, at work, in
friendships. Existing supports are either expensive human coaching or generic flashcard apps that
don't work on live, messy, real-world interaction.

Why this scores well where SynthForensics didn't: **the social good is showable, not just
described.** We can demonstrate the actual use case live on stage, and it survives Q&A because
the value is obvious and personal.

## Target user + framing guardrails
Primary user: a neurodivergent adult who wants to understand and practice social interaction on
their own terms. Not a clinical device, not a diagnosis tool.

Guardrails (the autistic self-advocacy community is sensitive to these, and so are social-good
judges):
- **Agency, not correction.** The tool offers *possible* interpretations the user can accept or
  reject. It never says "you did this wrong." The user is in control.
- **"Nothing about us without us."** Frame as a tool built *with* the community's input, not a
  fix imposed on them. If anyone on the team has a personal connection here, lead with it in the
  pitch. That is our answer to "why you?"
- **We surface signals, we do not claim to read minds.** See Defensibility below.

## What it does (the product)
Input: a short video clip of a conversation, or a live staged conversation via webcam + mic.
Output: a running, timestamped read of the social signals, e.g.:

> *0:12* — She just shifted back and crossed her arms while giving shorter answers. That often
> signals she's losing interest or feels put on the spot. Watch what happens if you change the
> subject or ask her a question.

The value is the **explanation of the reasoning**, not a one-word emotion label. It teaches the
pattern so the user gets better over time.

## How it works (pipeline)
1. **Capture** — webcam frames + microphone audio in the browser.
2. **Signal extraction:**
   - *Vision:* sample frames, run **DO vision inference** to describe facial expression, gaze,
     posture, gesture per moment.
   - *Audio:* transcript + tone/prosody. (See Open Questions: transcription likely runs in the
     browser or via a DO model; tone features may be extracted client-side.)
3. **Reasoning (the core):** a **DO reasoning model** (Claude / Llama on DO Inference) fuses the
   vision + audio signals over a short time window into a plain-language interpretation *with its
   reasoning and an uncertainty note.* This is the part that is NOT solvable with one prompt: it
   is multimodal fusion over time, not a single image classification.
4. **Delivery:** on-screen annotations synced to the video, optionally spoken via **DO / fal
   text-to-speech** for a hands-free "practice mode."
5. **Personalization / memory:** store the user's session history in **DO Managed Postgres +
   pgvector** so the tool learns which situations *this* user finds hard and tailors its coaching.
   This is our **Best Use of Data** story and it is a genuine one: assistive-tech users face the
   same handful of hard situations repeatedly.

## DigitalOcean tech mapping (Know the Audience)
Judges are DO reps. Every layer rides on their platform, and we say so on stage:
- **DO Inference — vision:** per-frame signal extraction.
- **DO Inference — reasoning model:** the multimodal fusion + explanation (the headline).
- **DO Inference — text-to-speech:** spoken coaching (practice mode).
- **DO Managed Postgres + pgvector:** personalization memory / Best Use of Data.
- **DO App Platform:** deploy from GitHub, live URL for the demo.
- **Multi-model flex (optional demo beat):** live-swap the reasoning model (Llama → Claude)
  mid-demo and show the interpretation get sharper. One line of code on their platform. This is
  exactly the "novel use of DO tech" message the judges want to hear.

## Defensibility (the honest-signals framing — read this before you pitch)
There is a real scientific caveat: **you cannot reliably read a specific emotion off a single
face.** The "one expression = one emotion" idea (basic-emotion theory) is contested; context
changes everything. If we claim "the AI detects she is angry," a sharp judge can knock it over,
and worse, we'd risk *teaching users to mis-read people.*

Our framing dodges this cleanly: we present **observable signals + a probabilistic
interpretation + the reasoning + explicit uncertainty**, never a verdict. "Crossed arms and
shorter replies *often* mean disengagement, but it depends on context" is both more honest and
more genuinely useful than "she is bored." This turns a weakness into a feature: the uncertainty
and reasoning ARE the teaching tool.

## How it demos (Entertaining Demo)
Two teammates run a short staged conversation on webcam. The screen shows the live read appearing
in real time. Then we invite a **judge to try it**: they have a 20-second chat and watch the tool
narrate the signals. Backup: a pre-recorded clip we annotate, in case live capture is flaky on
event wifi/lighting.

## Scoring against the 5 judged criteria
| Criterion | Read |
|---|---|
| Novelty (DO use) | Strong — multimodal fusion across DO models, not a plain chatbot. |
| Technical Complexity | Strong — vision + audio + temporal reasoning + pgvector memory. Not one prompt. |
| Social Good | Strong AND demoable — the differentiator vs. SynthForensics. |
| Entertaining Demo | Strong if live capture works; judge-participation beat is the hook. |
| Know the Audience | Strong — every layer is DO, with an explicit multi-model flex. |

## Open questions / decisions needed
1. **Real-time vs. clip-analysis?** Live coaching during a real conversation is the hard version
   (cloud vision latency is ~1-3s/call; true real-time is a stretch). Analyzing a short clip, or
   near-real-time on a staged convo with sampled frames, is far more feasible and demos just as
   well. **Recommended: near-real-time on sampled frames for the demo, positioned as a practice
   tool.** Decide before architecture.
2. **Whose face are we scanning — consent?** In a real conversation we're analyzing the *other*
   person, who hasn't consented. For the demo we use willing teammates/judges. For the product
   story, lean on ephemeral/on-device processing. Have an answer ready.
3. **Audio pipeline:** confirm whether DO Inference accepts audio input for transcription/tone,
   or whether transcription runs in-browser (Web Speech API) and only text/features go to DO.
   Keep the load-bearing DO work in the reasoning + vision layers regardless.
4. **Live coaching vs. after-the-fact review** as the primary product mode (affects UX entirely).
5. **Name.** Candidates: Cue, Subtext, Decode, Read the Room, Signal, Lens. TBD.

## Risks + mitigations
- **Latency** → sample frames, near-real-time not true real-time, pre-recorded backup clip.
- **Emotion-reading validity** → honest-signals framing above; never a verdict.
- **Condescension / framing** → agency-first language, community-informed, "practice" not "fix."
- **Live capture flaky on stage** → controlled lighting, pre-calibrated laptop, recorded backup.
- **Consent optics** → willing demo participants, ephemeral-processing story.

## Prize-target fit
- **Best UI/UX:** the live annotated-conversation interface is the whole product. Bullseye.
- **Best Use of Data:** the pgvector personalization memory. Make sure it's real, not bolted on.
