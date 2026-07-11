import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SignalFrame } from 'shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import NudgeToast from './NudgeToast';
import { useSession } from '@/session/SessionContext';
import { useSyntheticLoop } from '@/perception/useSyntheticLoop';
import { useFrameIngest } from '@/perception/useFrameIngest';
import { useMediaPipe } from '@/perception/useMediaPipe';
import {
  considerNudge,
  createEngineState,
  engineOptionsFromSearch,
  type EngineState,
} from '@/perception/eventEngine';
import { useSpeech } from '@/perception/useSpeech';
import { requestNudgeWithFallback } from '@/api/nudgeWithFallback';
import type { NudgeResponse } from 'shared';

function forceSynthetic() {
  return new URLSearchParams(window.location.search).has('synthetic');
}

interface LiveViewProps {
  onGoToTimeline: () => void;
}

function BarTrack({ width, variant }: { width: number; variant: string }) {
  const colors: Record<string, string> = {
    accent: 'bg-accent',
    alert: 'bg-alert',
    positive: 'bg-positive',
  };
  return (
    <div className="flex-1 h-[5px] bg-bar-track rounded-[1px] overflow-hidden">
      <motion.div
        className={`h-full ${colors[variant] ?? 'bg-accent'}`}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

function pct(n: number | undefined) {
  return Math.round((n ?? 0) * 100);
}

/** A tiny pulse trace. Uses the real detrended rPPG waveform when present,
 *  otherwise draws a modeled sine at the given BPM (synthetic mode). */
function PulseSparkline({
  waveform,
  bpm,
  phase,
  active,
}: {
  waveform: number[];
  bpm: number | null;
  phase: number;
  active: boolean;
}) {
  const W = 320;
  const H = 44;
  let vals = waveform;
  if (vals.length < 8) {
    const f = (bpm ?? 72) / 60;
    vals = Array.from({ length: 72 }, (_, i) => {
      const tt = (i / 72) * 3;
      return Math.sin(2 * Math.PI * f * tt + phase);
    });
  }
  const n = vals.length;
  const pts = vals
    .map((v, i) => {
      const x = (i / (n - 1)) * W;
      const y = H / 2 - v * (H / 2 - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--color-alert)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={active ? 0.95 : 0.4}
      />
    </svg>
  );
}

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveView({ onGoToTimeline }: LiveViewProps) {
  const {
    sessionId,
    context,
    frames,
    appendFrames,
    nudges,
    pushNudge,
    registerCleanup,
    startedAtMs,
    appendTranscript,
  } = useSession();

  const [videoSource, setVideoSource] = useState<'none' | 'camera' | 'clip'>('none');
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [latest, setLatest] = useState<SignalFrame | null>(null);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [toastId, setToastId] = useState<string | null>(null);
  const [nudgeError, setNudgeError] = useState<string | null>(null);
  const [autoNudge, setAutoNudge] = useState(true);
  const [meshOn, setMeshOn] = useState(true);
  const [meshCanvas, setMeshCanvas] = useState<HTMLCanvasElement | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<EngineState>(createEngineState());
  const engineOpts = useMemo(() => engineOptionsFromSearch(), []);
  const nudgeInFlight = useRef(false);
  const framesRef = useRef(frames);
  framesRef.current = frames;

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    registerCleanup(() => {
      stopTracks();
      if (clipUrl) URL.revokeObjectURL(clipUrl);
    });
    return () => registerCleanup(null);
  }, [registerCleanup, stopTracks, clipUrl]);

  useEffect(() => {
    engineRef.current = createEngineState();
  }, [sessionId]);

  const fireNudge = useCallback(
    async (confidence: NudgeResponse['confidence'], evidence: string[], t: number) => {
      if (nudgeInFlight.current) return;
      nudgeInFlight.current = true;
      setNudgeBusy(true);
      setNudgeError(null);
      try {
        const { response, fallback } = await requestNudgeWithFallback({
          sessionId: sessionId ?? undefined,
          context: context.trim() || undefined,
          confidence,
          evidence,
          recentFrames: framesRef.current.slice(-25),
        });
        pushNudge(response, t);
        setToastId(`${Date.now()}`);
        if (fallback) setNudgeError('Using offline nudge phrasing');
      } catch (err) {
        setNudgeError(err instanceof Error ? err.message : 'Nudge failed');
      } finally {
        nudgeInFlight.current = false;
        setNudgeBusy(false);
      }
    },
    [sessionId, context, pushNudge],
  );

  const onFrame = useCallback(
    (frame: SignalFrame) => {
      setLatest(frame);
      appendFrames([frame]);

      if (!autoNudge) return;
      const { state, candidate } = considerNudge(engineRef.current, frame, engineOpts);
      engineRef.current = state;
      if (candidate) {
        void fireNudge(candidate.confidence, candidate.evidence, frame.t);
      }
    },
    [appendFrames, autoNudge, engineOpts, fireNudge],
  );

  const wantSynthetic =
    forceSynthetic() || videoSource !== 'camera' || !sessionId;
  const wantMediaPipe =
    Boolean(sessionId) && videoSource === 'camera' && !forceSynthetic();

  const { status: mpStatus, error: mpError, pulseRef } = useMediaPipe({
    enabled: wantMediaPipe,
    video: videoEl,
    startedAtMs,
    onFrame,
    meshCanvas,
    meshEnabled: meshOn,
  });

  const syntheticOn =
    Boolean(sessionId) &&
    (wantSynthetic || mpStatus === 'error' || (wantMediaPipe && mpStatus !== 'ready'));

  useSyntheticLoop(syntheticOn && (wantSynthetic || mpStatus !== 'ready'), onFrame);
  useFrameIngest(sessionId, frames);
  useSpeech(Boolean(sessionId), startedAtMs, appendTranscript);

  const sourceLabel = forceSynthetic()
    ? 'synthetic (?synthetic=1)'
    : videoSource === 'camera' && mpStatus === 'ready'
      ? 'MediaPipe · 5 Hz'
      : videoSource === 'camera' && mpStatus === 'loading'
        ? 'MediaPipe loading…'
        : 'synthetic fallback · 5 Hz';

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoEl(videoRef.current);
      }
      setVideoSource('camera');
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const handleStopCamera = () => {
    stopTracks();
    setVideoEl(null);
    setVideoSource('none');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopTracks();
    const url = URL.createObjectURL(file);
    setClipUrl(url);
    setVideoSource('clip');
  };

  const handleClearClip = () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl(null);
    setVideoSource('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNudge = async () => {
    if (!latest || nudgeBusy) return;
    const topEmotion = latest.emotions
      ? (Object.entries(latest.emotions) as [string, number][]).sort((a, b) => b[1] - a[1])[0]
      : null;
    const evidence = [
      `engagement ~${pct(latest.engagement)}%`,
      `attention ~${pct(latest.attention)}%`,
      ...(latest.signals?.gazeAway != null
        ? [`gazeAway ~${pct(latest.signals.gazeAway)}%`]
        : []),
      ...(latest.signals?.smile != null ? [`smile ~${pct(latest.signals.smile)}%`] : []),
      ...(topEmotion
        ? [`soft state lean: ${topEmotion[0]} ~${pct(topEmotion[1])}% (experimental)`]
        : []),
    ].slice(0, 12);
    await fireNudge(latest.confidence ?? 'medium', evidence, latest.t);
  };

  const activeToast = useMemo(() => {
    if (!toastId) return null;
    const last = nudges[nudges.length - 1];
    if (!last) return null;
    return { ...last, id: toastId };
  }, [nudges, toastId]);

  const confPct =
    latest?.confidence === 'high' ? 88 : latest?.confidence === 'medium' ? 64 : latest ? 42 : 0;

  const body = useMemo(() => {
    const bpmRaw = latest?.signals?.bpm;
    const arousal = latest?.signals?.arousal ?? null;
    const conf = latest?.signals?.pulseConf ?? 0;
    const confLabel = conf > 0.5 ? 'high' : conf > 0.25 ? 'medium' : 'low';
    // Live divergence hint: face reads steady/positive while the body is aroused.
    const faceCalm = (latest?.emotions?.positive ?? 0) + (latest?.emotions?.calm ?? 0);
    const diverging = arousal != null && arousal > 0.62 && faceCalm > 0.5;
    return {
      bpm: typeof bpmRaw === 'number' ? Math.round(bpmRaw) : null,
      arousal,
      conf,
      confLabel,
      diverging,
    };
  }, [latest]);

  const signalRows = [
    { label: 'Engagement', width: pct(latest?.engagement), variant: 'accent' },
    { label: 'Attention', width: pct(latest?.attention), variant: 'positive' },
    { label: 'Smile', width: pct(latest?.signals?.smile), variant: 'positive' },
    { label: 'Lean-in', width: pct(latest?.signals?.lean), variant: 'accent' },
    {
      label: 'Gaze away',
      width: pct(latest?.signals?.gazeAway),
      variant: (latest?.signals?.gazeAway ?? 0) > 0.55 ? 'alert' : 'accent',
    },
  ];

  const emotionRows = useMemo(() => {
    if (!latest?.emotions) return [] as Array<{ label: string; p: number }>;
    return (
      [
        { label: 'calm', p: latest.emotions.calm },
        { label: 'positive', p: latest.emotions.positive },
        { label: 'tense', p: latest.emotions.tense },
        { label: 'uncertain', p: latest.emotions.uncertain },
      ] as Array<{ label: string; p: number }>
    ).sort((a, b) => b.p - a.p);
  }, [latest]);

  const talkStats = useMemo(() => {
    if (frames.length < 5 || !latest) return null;
    const window = frames.slice(-50);
    const talkingFrac =
      window.filter((f) => (f.signals?.talking ?? 0) > 0.35).length / window.length;
    let mono = 0;
    for (let i = frames.length - 1; i >= 0; i--) {
      if ((frames[i]?.signals?.talking ?? 0) > 0.35) mono += 0.2;
      else break;
    }
    return { talkShare: talkingFrac, floorSec: mono };
  }, [frames, latest]);

  const recentNudges = [...nudges].reverse().slice(0, 5);

  return (
    <section>
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">Live session</h2>
          <p className="font-mono text-xs text-ink-3 mt-1">
            {sourceLabel} · B = dip · N = masked arousal (synthetic) · video stays on device
          </p>
          {mpError && (
            <p className="text-xs text-alert mt-1" role="alert">
              MediaPipe: {mpError} — using synthetic signals
            </p>
          )}
        </div>
        <Badge variant="accent" size="sm">
          {sessionId ? `session ${sessionId.slice(0, 8)}…` : 'no session'}
        </Badge>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-10 items-start max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-3.5">
          <div className="aspect-[4/3] bg-paper-2 border border-rule rounded-[2px] flex items-center justify-center relative overflow-hidden">
            {videoSource === 'none' && (
              <div className="text-center p-6">
                <p className="text-[15px] font-medium text-ink-2 mb-0.5">Camera feed</p>
                <p className="font-mono text-xs text-ink-3">optional — signals run synthetically</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay={videoSource === 'camera'}
              muted={videoSource === 'camera'}
              controls={videoSource === 'clip'}
              src={videoSource === 'clip' && clipUrl ? clipUrl : undefined}
              className={`w-full h-full ${videoSource === 'clip' ? 'object-contain bg-black' : 'object-cover'} ${videoSource === 'none' ? 'hidden' : 'block'}`}
              playsInline
            />
            {videoSource === 'camera' && (
              <canvas
                ref={setMeshCanvas}
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden
              />
            )}
          </div>

          <input
            type="file"
            accept="video/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2.5">
            {videoSource === 'none' && (
              <>
                <Button variant="primary" className="flex-1" onClick={() => void handleStartCamera()}>
                  Start Live Camera
                </Button>
                <Button variant="default" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  Upload Clip
                </Button>
              </>
            )}
            {videoSource === 'camera' && (
              <>
                <Button
                  variant="default"
                  className="flex-1 text-alert border-alert/20 hover:bg-alert/10"
                  onClick={handleStopCamera}
                >
                  Stop Camera
                </Button>
                <Button
                  variant={meshOn ? 'primary' : 'default'}
                  className="flex-1"
                  onClick={() => setMeshOn((v) => !v)}
                >
                  Mesh {meshOn ? 'on' : 'off'}
                </Button>
              </>
            )}
            {videoSource === 'clip' && (
              <Button variant="default" className="flex-1" onClick={handleClearClip}>
                Clear Clip
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[26px]">
          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
              <CardDescription>
                {latest ? `t = ${formatTime(latest.t)} · 5 Hz` : 'warming up'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-ink-2 mb-1.5">
                    Confidence{' '}
                    <Badge size="sm" variant="accent" className="ml-1">
                      {latest?.confidence ?? '—'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <BarTrack width={confPct} variant="accent" />
                    <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">
                      {confPct}%
                    </span>
                  </div>
                </div>
              </div>
              {talkStats && (
                <p className="font-mono text-[11px] text-ink-2 mt-3 leading-relaxed">
                  Floor: you ~{Math.round(talkStats.talkShare * 100)}% of last 10s
                  {talkStats.floorSec >= 1
                    ? ` · holding ~${Math.round(talkStats.floorSec)}s`
                    : ''}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Body</CardTitle>
              <CardDescription>rPPG · pulse from webcam · experimental</CardDescription>
            </CardHeader>
            <CardContent>
              {body.bpm == null ? (
                <p className="text-[13px] text-ink-3">
                  Reading pulse from skin colour… hold still ~6s.
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[34px] leading-none font-light text-ink tabular-nums">
                        {body.bpm}
                      </span>
                      <span className="font-mono text-xs text-ink-3">bpm</span>
                    </div>
                    <Badge
                      size="sm"
                      variant={body.confLabel === 'low' ? 'alert' : 'accent'}
                    >
                      {body.confLabel}
                    </Badge>
                  </div>
                  <PulseSparkline
                    waveform={pulseRef?.current.waveform ?? []}
                    bpm={body.bpm}
                    phase={(latest?.t ?? 0) * 6}
                    active={body.conf > 0.25}
                  />
                  <div className="grid grid-cols-[88px_1fr_40px] items-center gap-2.5 mt-1">
                    <span className="text-[13px] text-ink-2">Arousal</span>
                    <BarTrack
                      width={pct(body.arousal ?? 0.5)}
                      variant={(body.arousal ?? 0) > 0.62 ? 'alert' : 'accent'}
                    />
                    <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">
                      {pct(body.arousal ?? 0.5)}%
                    </span>
                  </div>
                  {body.diverging && (
                    <p className="font-mono text-[11px] text-alert mt-2.5 leading-relaxed">
                      face steady · body active — worth a look
                    </p>
                  )}
                  <p className="font-mono text-[10px] text-ink-3 mt-2 leading-relaxed">
                    Involuntary signal · relative to their own baseline · not a diagnosis
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
              <CardDescription>observable descriptors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3.5">
                {signalRows.map((s) => (
                  <div key={s.label} className="grid grid-cols-[88px_1fr_40px] items-center gap-2.5">
                    <span className="text-[13px] text-ink-2">{s.label}</span>
                    <BarTrack width={s.width} variant={s.variant} />
                    <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">
                      {s.width}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>State probabilities</CardTitle>
              <CardDescription>experimental · soft distribution · not a diagnosis</CardDescription>
            </CardHeader>
            <CardContent>
              {emotionRows.length === 0 ? (
                <p className="text-[13px] text-ink-3">Waiting for face signals…</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {emotionRows.map(({ label, p }) => (
                    <div key={label} className="grid grid-cols-[88px_1fr_40px] items-center gap-2.5">
                      <span className="text-[13px] text-ink-2 capitalize">{label}</span>
                      <BarTrack
                        width={pct(p)}
                        variant={
                          label === 'tense' || label === 'uncertain' ? 'alert' : 'positive'
                        }
                      />
                      <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">
                        {pct(p)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  disabled={!latest || nudgeBusy}
                  onClick={() => void handleNudge()}
                >
                  {nudgeBusy ? 'Requesting…' : 'Request nudge'}
                </Button>
                <label className="flex items-center gap-2 text-[12px] text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoNudge}
                    onChange={(e) => setAutoNudge(e.target.checked)}
                    className="accent-[var(--color-accent)]"
                  />
                  Auto-nudge (event engine · 90s cooldown)
                </label>
                {nudgeError && (
                  <p className="text-xs text-alert" role="alert">
                    {nudgeError}
                  </p>
                )}
                <p className="font-mono text-[10px] text-ink-3">
                  Tune with ?dipZ=-1.2&dipHold=8&cooldown=60 · press B to dip (synthetic)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <Button variant="link" size="sm" onClick={onGoToTimeline} className="text-xs p-0">
                End → debrief
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {recentNudges.length === 0 && (
                  <p className="text-[13px] text-ink-3">No nudges yet — request one when ready.</p>
                )}
                {recentNudges.map((ev, i, arr) => (
                  <div
                    key={ev.id}
                    className={`grid grid-cols-[46px_1fr_auto] gap-3 py-[11px] items-center ${i < arr.length - 1 ? 'border-b border-rule' : ''} ${i === 0 ? 'pt-0' : ''} ${i === arr.length - 1 ? 'pb-0' : ''}`}
                  >
                    <span className="font-mono text-xs text-ink-3">{formatTime(ev.t)}</span>
                    <span className="text-[13px] leading-normal">{ev.text}</span>
                    <Badge variant="accent" size="sm">
                      {ev.confidence}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[10px] text-ink-3 mt-3">
                frames buffered: {frames.length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <NudgeToast nudge={activeToast} onDismiss={() => setToastId(null)} />
    </section>
  );
}
