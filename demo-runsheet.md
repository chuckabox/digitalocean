# Wavelength — Demo Runsheet

> Who does what on stage, in what order, and what we fall back to when something breaks.
> Pairs with `pitch-script.md` (the words). This is the operations side.

## Roles (assign names before demo day)
- **Narrator** — delivers the pitch script, owns the clock.
- **Driver** — the laptop: plays the sample conversation, runs the debrief, scrolls to moments.
- **Actors (x2)** — reenact the mixer conversation live (or play the pre-recorded clip).
- Solo-fallback: Narrator and Driver can be one person; actors replaced by the recorded clip.

## Pre-demo checklist (do at the venue, not the night before)
- [ ] Deployed app URL loads on venue wifi AND on a phone hotspot (test both).
      Backend is live: https://wavelength-brain-37j5z.ondigitalocean.app/health
- [ ] DO model access key works: run `python debrief/run_debrief.py` once from the venue.
- [ ] Sample debrief pre-generated and cached (see Fallback ladder rung 2).
- [ ] Pre-recorded conversation clip on local disk, not streamed.
- [ ] Laptop: notifications off, brightness max, font zoom up for the back of the room.
- [ ] Timer visible to Narrator (2 minutes is short; the silence beat eats 5 seconds).

## The 2-minute flow (from pitch-script.md, operational view)
| Clock | Beat | Driver does |
|---|---|---|
| 0:00 | Hook: the origin story | Nothing on screen — faces on the Narrator |
| 0:20 | Problem | Title slide / app landing |
| 0:35 | Solution: what Wavelength is | App open, empty state |
| 0:55 | The conversation plays; STOP on the silence | Play clip; pause at 00:49; let it hang. **Click analyze as the clip starts** — real generation takes ~20s, so it finishes while the clip plays |
| 1:10 | Reveal the debrief | Results are already in; scroll begins |
| 1:20 | Land on the 00:44 moment | Scroll to the disclosure moment; read `try_instead` aloud |
| 1:40 | Tech + DO story | Metrics panel + (optional) live model swap |
| 2:00 | Close + tagline | Landing view: "Get on their wavelength." |

## Fallback ladder (highest fidelity first — drop one rung per failure, never scramble)
1. **Full live**: live inference on DO from the venue, video layer included.
2. **Cached debrief**: inference pre-run at the venue that morning; UI renders the cached JSON
   (`debrief/sample-debrief.json` shape). Identical on screen — judges cannot tell.
3. **Local everything**: static UI + fixture JSON from disk, no network at all.
4. **Nuclear**: screen-recording of the whole flow, narrated live. Record this at rung 1 or 2
   while things work.

Rule: decide the rung BEFORE walking on stage, based on the checklist. Do not debug live.

## Live model-swap beat (optional, only at rungs 1-2)
Dropdown Llama 3.3 → Claude, re-run the 00:44 moment, point at the sharper interpretation.
One sentence: "One key, any model — that's the platform flex." If inference is slower than ~8s
at the venue, CUT this beat; a stall kills more points than the flex earns.

## Q&A stance (details in pitch-script.md)
Emotion-validity → "we never output verdicts, only hedged signals with confidence levels."
Consent → "user-initiated, ephemeral, both parties consent; practice mode needs no recording."
One-prompt → "diarization + computed metrics + temporal fusion + pgvector memory. The prompt is
the visible tip."
