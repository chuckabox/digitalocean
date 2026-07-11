/**
 * Wavelength - bridge from the LIVE state to the DEBRIEF state.
 *
 * Dinil's LIVE loop produces ~1 Hz "engagement frames" from MediaPipe. Our
 * /api/debrief consumes a `visual_signals` array of *notable shifts* only
 * ([{t, observation}]). This pure function is that converter: it scans the
 * frame stream, finds the moments that actually changed, and writes them as
 * observable-behaviour phrases (never emotion labels), matching the debrief's
 * expected style.
 *
 * Drop into the React app; call at End Session, pass the result as
 * transcript.visual_signals to /api/debrief.
 *
 *   import { framesToVisualSignals } from "./frames_to_signals.js";
 *   const visual_signals = framesToVisualSignals(engagementFrames);
 *
 * Expected frame shape (adapt keys to your engine):
 *   { t: 47, engagement: 0.32, signals: { gazeAway: 0.8, smile: 0.1, lean: -0.3 } }
 *   (t = seconds from start; engagement/signals in 0..1 vs the person's baseline)
 */

const MIN_GAP_S = 8; // don't emit two observations closer than this (avoid spam)

function fmt(t) {
  const s = Math.max(0, Math.round(t));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

/**
 * @param {Array<{t:number, engagement?:number, signals?:object}>} frames
 * @returns {Array<{t:string, observation:string}>}
 */
export function framesToVisualSignals(frames, opts = {}) {
  const minGap = opts.minGapSeconds ?? MIN_GAP_S;
  if (!Array.isArray(frames) || frames.length < 2) return [];

  const out = [];
  let lastEmitT = -Infinity;
  let gazeAwayRun = 0;

  const emit = (t, observation) => {
    if (t - lastEmitT < minGap) return;
    out.push({ t: fmt(t), observation });
    lastEmitT = t;
  };

  // rolling reference for engagement drop detection
  const eng = frames.map((f) => f.engagement ?? null).filter((v) => v != null);
  const baseline = eng.length ? eng.slice(0, Math.min(eng.length, 15)).reduce((a, b) => a + b, 0) / Math.min(eng.length, 15) : null;

  for (let i = 1; i < frames.length; i++) {
    const f = frames[i], p = frames[i - 1];
    const sig = f.signals || {}, psig = p.signals || {};

    // sustained gaze away
    if ((sig.gazeAway ?? 0) > 0.5) {
      gazeAwayRun += (f.t - p.t);
      if (gazeAwayRun >= 4) emit(f.t, `partner's gaze drifted away for about ${Math.round(gazeAwayRun)}s`);
    } else {
      gazeAwayRun = 0;
    }

    // smile fading (meaningful drop)
    if ((psig.smile ?? 0) - (sig.smile ?? 0) > 0.3) emit(f.t, "partner's smile faded");

    // leaning back / withdrawing
    if ((psig.lean ?? 0) - (sig.lean ?? 0) > 0.3) emit(f.t, "partner leaned back, pulling away slightly");

    // engagement fell clearly below their own baseline
    if (baseline != null && f.engagement != null && baseline - f.engagement > 0.25) {
      emit(f.t, "partner's overall engagement dropped from where it started");
    }

    // re-engagement (recovery is worth surfacing too - the debrief can praise it)
    if (baseline != null && f.engagement != null && f.engagement - baseline > 0.2 && (p.engagement ?? 0) <= baseline) {
      emit(f.t, "partner re-engaged, leaning back in");
    }
  }

  return out;
}

// Node/CommonJS fallback so it's importable in tests too.
if (typeof module !== "undefined" && module.exports) module.exports = { framesToVisualSignals };
