/**
 * Wavelength API client — drop into the React app (src/lib/wavelength-client.ts).
 *
 * Framework-agnostic, dependency-free (just fetch). Wraps the deployed backend:
 *   https://wavelength-brain-37j5z.ondigitalocean.app
 * CORS is open, so this works straight from the browser.
 *
 * The three UI states map one-to-one to three calls:
 *   LIVE      → postFrames() every ~5s, getNudge() when your event engine fires
 *   DEBRIEF   → getDebrief() at End Session (pass visual_signals from the live loop)
 *   STATS     → getProgress() for the cross-session progress panel
 */

export const WAVELENGTH_API = "https://wavelength-brain-37j5z.ondigitalocean.app";

export type Confidence = "low" | "medium" | "high";
export type Source = "audio" | "video" | "both";

export interface Turn { speaker: string; t: string; text: string; }
export interface VisualSignal { t: string; observation: string; }

export interface Transcript {
  conversation_id?: string;
  user_speaker: string;
  turns: Turn[];
  visual_signals?: VisualSignal[];   // from frames_to_signals.ts at End Session
}

export interface DebriefMetrics {
  user_talk_ratio: number;
  questions_asked_by_user: number;
  questions_asked_by_other: number;
  longest_user_monologue_seconds: number;
}

export interface Moment {
  t: string;
  quote: string;
  observation: string;
  interpretation: string;
  confidence: Confidence;
  why_it_matters: string;
  try_instead: string;
  source?: Source;                   // badge which channel caught the moment
}

export interface Pattern {
  label: string;
  finding: string;
  coaching: string;
  recurring: boolean;                // true = seen in a past session
}

export interface Debrief {
  summary: string;
  metrics: DebriefMetrics;
  moments: Moment[];
  patterns: Pattern[];
  what_worked: string[];
  next_time: string[];
}

export type NudgeModel = "anthropic-claude-haiku-4.5" | "anthropic-claude-4.6-sonnet";

export interface NudgeRequest {
  confidence: Confidence;
  evidence: string[];                // from your client-side event engine
  context?: string;                  // optional: "catching up with a friend"
}
export interface NudgeResponse {
  text: string;
  confidence: Confidence;
  evidence: string[];
}

export interface SignalFrame {
  t: number;                         // seconds from session start
  engagement?: number;
  valence?: number;
  attention?: number;
  signals?: Record<string, number>;
  confidence?: Confidence;
}

async function postJson<T>(path: string, body: unknown, timeoutMs = 60000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${WAVELENGTH_API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data && data.error) || `HTTP ${r.status}`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/** DEBRIEF state. ~20s on Haiku, ~30s on Sonnet. Pass history=true for recurring-pattern flags. */
export function getDebrief(
  transcript: Transcript,
  opts: { model?: NudgeModel; history?: boolean } = {}
): Promise<Debrief> {
  const model = opts.model ?? "anthropic-claude-haiku-4.5";
  const history = opts.history ? "1" : "0";
  return postJson<Debrief>(`/api/debrief?model=${encodeURIComponent(model)}&history=${history}`, transcript, 90000);
}

/** LIVE state. ~1.5s. Your engine decides WHEN + gathers evidence; this only phrases it. */
export function getNudge(req: NudgeRequest): Promise<NudgeResponse> {
  return postJson<NudgeResponse>("/api/nudge", req, 15000);
}

/** LIVE state. Batch-persist signal frames every ~5s. Fire-and-forget is fine. */
export function postFrames(conversation_id: string, frames: SignalFrame[]): Promise<{ stored: number; total_for_session: number }> {
  return postJson("/api/frames", { conversation_id, frames }, 15000);
}

/** STATS state. Cross-session metric trends for the progress panel. */
export async function getProgress(): Promise<{ sessions: number; progress: Record<string, { values: number[]; verdict: string }> }> {
  const r = await fetch(`${WAVELENGTH_API}/api/progress`);
  return r.json();
}
