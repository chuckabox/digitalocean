# Sample Conversation + Gold Debrief

> Test fixture AND demo asset. A fictionalized, anonymized version of the origin story: a
> networking mixer where an early autism disclosure lands as dead silence, plus a couple of other
> coachable habits. Use this to (a) validate the debrief brain's output quality and (b) reenact on
> stage. "S1" is the user; "S2" is a stranger at the event.

## Transcript (speaker-labelled, what the pipeline produces)
```
S1  00:03  Hi, is this seat taken? I'm Sam.
S2  00:06  Oh, go for it. Alex. You here for the hackathon or the talks?
S1  00:09  The hackathon. I've done eleven of these. I usually do the backend, sometimes the
           whole stack. Last one I built a scheduling tool, the one before that a chatbot, the
           one before that a thing for parsing PDFs, which was actually harder than it sounds
           because the layouts are inconsistent and...
S2  00:41  Ha, nice. So a lot of experience then.
S1  00:44  Yeah. I should say, I'm autistic, so I might come across as a bit blunt.
S2  00:49  ...
S2  00:53  Oh. Okay. Cool.
S1  00:55  What's the async-invoke endpoint's polling interval, do you know?
S2  01:00  Uh, not off the top of my head. I might grab a coffee actually, good luck with it.
```

## What actually went wrong (for our own reference)
1. **00:09 monologue** — ~30 seconds of project history, no question back. S2 had to work to
   re-enter the conversation.
2. **00:44 disclosure timing** — the autism disclosure is honest and fine to share, but 40
   seconds in, to a stranger, with no rapport yet and framed as a warning ("might come across
   blunt"), it put the burden on S2 to react with nothing to react to. Hence 00:49 silence.
3. **00:55 hard topic jump** — straight to a technical question after a socially loaded moment,
   skipping the repair.
4. **Reciprocal questions: zero.** S1 never asked S2 anything back.

## Gold debrief (target output — this is the quality bar for the brain)
```json
{
  "summary": "You came across as knowledgeable and genuine, and being open about being autistic is completely fine. The conversation went quiet mainly because of timing and balance: a long stretch about your projects with no question back, then the disclosure very early before you two had any rapport. Small changes to when and how, not whether, would help a lot.",
  "metrics": {
    "user_talk_ratio": 0.66,
    "questions_asked_by_user": 2,
    "questions_asked_by_other": 1,
    "longest_user_monologue_seconds": 32
  },
  "moments": [
    {
      "t": "00:09",
      "quote": "I've done eleven of these. I usually do the backend...",
      "observation": "About 32 seconds of your project history with no question back to Alex.",
      "interpretation": "Long monologues early on can make the other person feel like an audience rather than a participant, which often makes them disengage.",
      "confidence": "medium",
      "why_it_matters": "Early conversation is usually a back-and-forth to find common ground. Trading turns roughly evenly signals interest in them, not just your topic.",
      "try_instead": "Give one line, then hand it back: 'I mostly do backend. What are you hoping to build here?'"
    },
    {
      "t": "00:44",
      "quote": "I'm autistic, so I might come across as a bit blunt.",
      "observation": "You disclosed being autistic about 40 seconds in, framed as a warning, before much rapport was built. Alex went quiet for a few seconds.",
      "interpretation": "The disclosure itself is fine. Very early, to a stranger, framed as a caution, it can leave the other person unsure how to respond, which often reads as an awkward pause. That is about their uncertainty, not you doing something wrong.",
      "confidence": "medium",
      "why_it_matters": "Personal disclosures usually land better once there is a little rapport, and they land warmer framed as a neutral fact than as a warning about yourself.",
      "try_instead": "If you want to share it, later and lighter works better: 'Heads up, I'm pretty direct, I find it easier that way.' Or share it once you two are clicking."
    },
    {
      "t": "00:55",
      "quote": "What's the async-invoke endpoint's polling interval, do you know?",
      "observation": "Right after the quiet moment, you moved straight to a technical question.",
      "interpretation": "Jumping topics right after an awkward beat can skip the small repair that resets the mood, so the awkwardness carries over.",
      "confidence": "low",
      "why_it_matters": "A tiny acknowledgement often resets a stalled moment before you move on.",
      "try_instead": "Bridge first: 'Anyway, I didn't mean to info-dump. What are you working on?'"
    }
  ],
  "patterns": [
    {
      "label": "reciprocal questions",
      "finding": "You asked two questions, but neither was about Alex: one was logistics ('is this seat taken?'), one was technical.",
      "coaching": "Aim for at least one question about the other person in the first minute. A simple rule: after you share something, ask them the same thing back.",
      "recurring": false
    },
    {
      "label": "talk-time balance",
      "finding": "You spoke about 66% of the time.",
      "coaching": "Target closer to 50/50 early on. If you've said three sentences in a row, that's your cue to hand it back.",
      "recurring": false
    }
  ],
  "what_worked": [
    "You were warm and easy in the opening ('is this seat taken? I'm Sam') — a clean, friendly start.",
    "You were honest and self-aware, which is a real strength once the timing is right."
  ],
  "next_time": [
    "After you share something, ask them the same thing back — this alone fixes most of the balance.",
    "Save personal disclosures for once there's a bit of rapport, and frame them as a neutral fact, not a warning.",
    "If a moment goes quiet, do a one-line repair before changing topic."
  ]
}
```

## Demo note
On stage: play/read this conversation (the silence at 00:49 is the emotional hook), then run the
debrief live and land on the 00:44 moment. It's true, it's legible in under a minute, and the
"here's what to try" turns an awkward memory into something useful. That contrast is the demo.
