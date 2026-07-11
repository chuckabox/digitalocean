import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from './ui/button';
import { useSession } from '@/session/SessionContext';

const TRACKED = [
  'Facial expression signals (smile, brow, gaze) — derived on this device',
  'Attention and engagement trends over time',
  'Speech text via the browser (optional)',
  'Raw video and audio never leave this laptop',
] as const;

export default function ConsentView() {
  const reduce = useReducedMotion();
  const { context, setContext, startSession, starting, startError, kill, setPhase } =
    useSession();
  const [partnerConsent, setPartnerConsent] = useState(false);
  const [userConsent, setUserConsent] = useState(false);
  const [mirrorError, setMirrorError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function startMirror() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) {
          setMirrorError('Camera preview unavailable — you can still consent and continue.');
        }
      }
    }
    void startMirror();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const stopMirror = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleConsent = async () => {
    if (!userConsent || !partnerConsent) return;
    stopMirror();
    try {
      await startSession();
    } catch {
      /* startError set in context */
    }
  };

  const handleKill = () => {
    stopMirror();
    kill();
  };

  return (
    <div className="pt-4 pb-16 max-w-3xl mx-auto flex flex-col gap-10">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-3"
      >
        <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3">Consent</p>
        <h1 className="text-[32px] md:text-[40px] font-medium tracking-tight text-ink leading-tight">
          Before we look.
        </h1>
        <p className="text-[15px] text-ink-2 leading-relaxed max-w-[52ch]">
          Wavelength only runs when both people agree. Video stays on this laptop — only
          derived signals and transcript text reach DigitalOcean.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] bg-paper-2 border border-rule overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            {mirrorError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink-2">
                {mirrorError}
              </div>
            )}
          </div>
          <p className="text-xs text-ink-3">Mirror preview — local only, not recorded.</p>
        </div>

        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-2.5">
            {TRACKED.map((item) => (
              <li key={item} className="text-[14px] text-ink-2 leading-snug pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1.5 before:h-1.5 before:bg-accent">
                {item}
              </li>
            ))}
          </ul>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink">Session context</span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="e.g. Catching up with a friend — I want to know if I talk too much."
              className="w-full resize-y border border-rule bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
            />
            <span className="font-mono text-[10px] text-ink-3">{context.length}/2000</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={userConsent}
              onChange={(e) => setUserConsent(e.target.checked)}
              className="mt-1 accent-[var(--color-accent)]"
            />
            <span className="text-[14px] text-ink-2">I consent to on-device analysis for this session.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={partnerConsent}
              onChange={(e) => setPartnerConsent(e.target.checked)}
              className="mt-1 accent-[var(--color-accent)]"
            />
            <span className="text-[14px] text-ink-2">My partner consents (visible agreement).</span>
          </label>

          {startError && (
            <p className="text-sm text-alert" role="alert">
              {startError}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              variant="primary"
              size="lg"
              disabled={!userConsent || !partnerConsent || starting}
              onClick={() => void handleConsent()}
            >
              {starting ? 'Starting…' : 'I consent — start'}
            </Button>
            <Button variant="ghost" onClick={() => { stopMirror(); setPhase('home'); }}>
              Back
            </Button>
            <Button
              variant="default"
              className="!border-alert !text-alert hover:!bg-alert-soft ml-auto"
              onClick={handleKill}
            >
              Kill switch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
