# Wavelength - Pitch Script + Q&A Prep

> The 2-minute stage narrative and the hard-question prep. Spoken lines are written to be said out
> loud, not read off a slide. Taglines: "Get on their wavelength." / "Practice the conversation you
> already had."

## The 2-minute script

**[0:00-0:20] Hook (tell the real story, slow down)**
> A few weeks ago we were travelling with a friend. Smart, kind, genuinely funny once you know him.
> We watched him walk up to someone new, and about thirty seconds in, he told them he was autistic.
> Completely true, completely fine. But the timing caught the other person off guard, and the whole
> thing just went silent. He walked away not knowing why. Nobody ever tells you why.

**[0:20-0:35] Problem**
> For a lot of neurodivergent people, the unwritten rules of conversation are invisible in the
> moment. When to share something personal. When you're talking too much. When someone's interest
> just shifted. You only find out you missed it after it's already too late to fix.

**[0:35-0:55] Solution**
> So we built Wavelength. You have a real conversation, and afterwards Wavelength debriefs it with
> you. Not whispering in your ear during the conversation, that would just be one more voice to
> track. Afterwards. It shows you what happened, why it landed the way it did, and exactly what to
> try next time.

**[0:55-1:40] Live demo** *(this is the centrepiece, let it breathe)*
> Here's a real conversation. Watch this moment.

*[Play/read the sample conversation. Stop on the disclosure and the silence at 00:49. Let the pause land.]*

> Now here's the debrief.

*[Run Wavelength live on the transcript. Land on the 00:44 moment.]*

> Notice it never says he did anything wrong. It says the disclosure was fine, the timing is what
> made it land flat, and here is the same thing thirty seconds later, once there is a bit of rapport.
> It also caught that he talked two-thirds of the time and never asked a single question back.
> Concrete, honest, and something he can actually practice.

**[1:40-2:00] Tech + why DigitalOcean (know the audience)**
> Everything you just watched ran live on DigitalOcean: the backend on App Platform, the
> reasoning on the Inference Engine — Claude Haiku, about twenty seconds a debrief — and every
> conversation lands in Managed Postgres, so Wavelength learns your recurring patterns and can
> show you actually improving across sessions. We compute the hard numbers in code so the
> coaching is grounded in facts, not vibes.

*[Optional flex: swap the model live — VERIFIED, both models pass reliably.]*
> One dropdown, and the same debrief re-runs on Claude Sonnet — watch the reads get sharper.
> One key, any model. That's their platform doing the flexing.

*[Optional closing beat: hit "Read aloud" — the debrief speaks in a calm voice.]*
> And for anyone who processes speech better than text, Wavelength will just tell you — kindly.

**[2:00] Close**
> Real social coaching costs thousands, or it just doesn't exist. Wavelength turns every awkward
> conversation you have already had into the one lesson nobody gave you. That's Wavelength.

## Q&A prep (the questions judges will actually ask)

**"How do you know the AI is right about what someone's feeling?"**
We never claim to read emotions or minds. We describe observable behaviour, talk time, question
count, timing, word choice, and give a hedged interpretation with a visible confidence level. The
numbers are facts computed in code. The interpretation is always "this often means", never "she
felt X". That honesty is deliberate, and it is safer for the user than false certainty.

**"Isn't recording the other person a consent problem?"**
Recording is user-initiated, and the recording is ephemeral and deletable. The coaching is about
the user's own behaviour, not profiling the other person. For pure practice, you role-play with a
willing partner. We designed around this rather than ignoring it.

**"Isn't this condescending? Does it treat autistic people as broken?"**
No. It is agency-first: it offers options, never corrections, and it always names what worked. It
is built with our autistic friends as the first testers. Many neurodivergent people specifically
prefer explicit, literal feedback over vague social hints, which is exactly what we give. Nothing
about us without us.

**"Couldn't ChatGPT do this in one prompt?"**
No. There is speaker separation, deterministic metric computation that grounds the model, temporal
analysis across the whole conversation, and a pgvector memory that makes patterns recurring across
sessions. The prompt is one visible piece of a real pipeline.

**"Why DigitalOcean specifically?"** *(judges love this one, be ready)*
One key, every model, so the live model swap is trivial. Managed Postgres with pgvector for the
memory. App Platform for deploy. The whole stack is theirs, which let us spend our time on the
actual product instead of plumbing.

**"Who pays for this?"**
Individuals who want to improve, as a subscription. And a real B2B angle: employers and
universities running neurodiversity-inclusion programs, and social-skills therapists who want a
between-sessions practice tool for clients.

**"Why not coach in real time, during the conversation?"** *(likely question — we have a strong answer)*
Deliberate design choice, for the user's sake. They're already working hard to track one voice;
a second voice whispering advice splits attention and makes the conversation worse, not better.
Debriefing afterward is how every serious skill gets coached — athletes watch film, pilots debrief
flights. Also: honest latency. Real-time cloud inference adds seconds of lag; a nudge that
arrives after the moment has passed is worse than none. Live nudges are on the roadmap as
opt-in, but the debrief is the product.

**"What does a debrief cost to run?"**
Around a cent of inference on Haiku. The whole demo today runs on pocket change — that's the
serverless pay-per-token model working as intended.
