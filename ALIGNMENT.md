# Team Alignment - DECISIONS LOCKED

> **Resolved by Connor.** Kept for context; the analysis below is what the decisions were based on.
>
> 1. **Name: Wavelength** — everywhere. Peter: rename CueReader; Dinil: update README.
> 2. **Live nudges: roadmap/vision, not in the 24h build.** The debrief is the core and the demo.
> 3. **Modality: audio is the core signal, video IS in scope** as a supporting layer
>    (observable behaviour only, fused with the transcript — see `debrief/extract_visuals.py`).
> 4. **Workflow: everyone builds on their own branch** (`connor-main`, `dinil-main`, Peter's),
>    merge before demo. The contract between us is `debrief/SPEC.md` + `debrief/sample-debrief.json`.

## Where everyone actually is
- **Connor + debrief work (`connor-main`):** post-conversation **debrief only**, audio-first,
  named **Wavelength**. See `pitch.md`, `debrief/`.
- **Dinil (`dinil-main` `AGENTS.md`):** a comprehensive **product vision**, explicitly *no
  architecture yet*. Re-centers **real-time live nudges** during the conversation ("a gentle
  nudge helped a real human connect better in real time" is his headline demo beat), plus an
  afterward debrief. Named **"Social co-pilot"**. Face/attention focused.
- **Peter (`main`):** a built website named **"CueReader"** around a **live camera feed + emotion
  bars + detected face** (real-time, visual). See `index.html`, `wireframe.md`.

**Dinil has not designed the technical architecture.** His doc is deliberately concept-only. So
"the architecture" does not exist yet on any branch.

## The good news: principles are already aligned
All three independently landed on the same non-negotiables: **no verdicts / hedged confidence,
consent-first, "a translator not a cure", agency-first, two-way.** Dinil's design-principles
section is excellent and matches the defensibility framing in `pitch.md` almost exactly. We are
not fighting about values. We are fighting about two concrete things.

## Divergence 1 - Name (easy, just decide and broadcast)
Wavelength (Connor) vs CueReader (Peter's site) vs Social co-pilot (Dinil's README).
**Recommendation: Wavelength** (Connor already chose it from a full shortlist). If agreed, Peter
renames CueReader, Dinil's README updates. Low effort, do it now so we stop diverging further.

## Divergence 2 - Real-time live nudges: in or out for the 24h build? (the real decision)
This is the fork that changes what everyone builds.

**The debrief is common ground.** Both Connor's pitch and Dinil's vision include an afterward
debrief. Nobody disagrees about that. The disagreement is only whether **live in-conversation
nudges** are in the hackathon build.

**The case for cutting live nudges from the build (Connor's position, and my recommendation):**
- Attention split: even rare nudges pull focus while the user is already working to track one
  voice. Connor's original objection.
- Latency: cloud vision is ~1-3s per call, so the nudge lands "a beat later", which may be too
  late for a fast cue.
- Demo fragility: reading faces live on stage, in unknown lighting, is the highest-risk thing we
  could put in front of judges. If it misfires live, the pitch dies.
- Validity is worst in real time: even Dinil's own doc lists "reading faces is genuinely
  uncertain" as a principle. That argues against making live face-reading the headline.

**The case for keeping them (Dinil's position, represented fairly):**
- His "a nudge helped a real human connect in real time" is a genuinely powerful, memorable beat.
- He mitigates the noise problem: nudges fire only on meaningful shifts, discreet, hedged,
  ignorable. That is a thoughtful design, not a naive one.

**Recommendation:** for the 24h build, **ship the debrief as the core and demo it live; keep live
nudges as the stated roadmap/vision, not a live-demo dependency.** If we finish the debrief with
real time to spare, add a *scripted/controlled* nudge beat that does not depend on live
face-reading working perfectly on stage. This protects the demo (our weakest-covered judging
criterion) while still letting us tell the fuller co-pilot story.

## Divergence 3 - Modality: audio-first vs face/visual
Connor's pitch is audio-first (the origin story is verbal; face-emotion reading is the shaky
part). Dinil and Peter lead with face/camera. Dinil's own humility principle supports treating
visual emotion as a weak, supporting signal rather than the core.
**Recommendation: audio/transcript is the core signal; video is an optional supporting layer.**

## If we converge (what each person builds)
- **Dinil:** design the actual architecture for the **debrief pipeline** (capture -> transcribe
  -> diarize -> reasoning model on DO -> Postgres/pgvector). The brain is already stubbed in
  `debrief/` (schema, prompt, metrics, reference runner) - wire it, don't rebuild it.
- **Peter:** rename to Wavelength; pivot the UI from live-emotion-bars to the **debrief view**
  (timeline of moments + flagged moments + redos). The exact JSON he renders is
  `debrief/sample-debrief.json`, contract in `debrief/SPEC.md`. He can build against that now.
- **Connor + brain:** finish the debrief brain; prove it live on DO once a model access key
  exists; own the pitch + demo runsheet.

## Decisions needed from Connor (then broadcast to the team)
1. Name = Wavelength? (y/n)
2. Live nudges: cut from build / stretch goal / core? (recommend: stretch, debrief is core)
3. Modality: audio-first with optional video? (recommend: yes)
4. Does everyone work off one branch/spec so we stop triple-building? (recommend: yes)
