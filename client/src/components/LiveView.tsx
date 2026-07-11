import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Engagement (0..1) from the frame nearest at-or-before time `t`. Frames are t-sorted. */
function engagementAt(frames: SignalFrame[], t: number): number | null {
  if (frames.length === 0) return null;
  let lo = 0;
  let hi = frames.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return frames[best]?.engagement ?? null;
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
    transcript,
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
  const [interim, setInterim] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<EngineState>(createEngineState());
  const engineOpts = useMemo(() => engineOptionsFromSearch(), []);
  const nudgeInFlight = useRef(false);
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Look up engagement at each line's timestamp when the line arrives (not every
  // frame), so the user can see the reading at the moment they said it.
  const transcriptRows = useMemo(
    () => transcript.map((turn) => ({ turn, engagement: engagementAt(framesRef.current, turn.t) })),
    [transcript],
  );

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

  // Keep the transcript feed pinned to the newest line as it (and the live
  // interim text) streams in.
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length, interim]);

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

  const forcedSynthetic = forceSynthetic();
  /** Show Tracking / Signals / State numbers only with camera (or ?synthetic=1). */
  const showLiveData = forcedSynthetic || videoSource === 'camera';
  const wantMediaPipe =
    Boolean(sessionId) && videoSource === 'camera' && !forcedSynthetic;

  const { status: mpStatus, error: mpError } = useMediaPipe({
    enabled: wantMediaPipe,
    video: videoEl,
    startedAtMs,
    onFrame,
    meshCanvas,
    meshEnabled: meshOn,
  });

  // Synthetic only for demos/clip, or while camera waits on MediaPipe — never when idle.
  const syntheticEnabled =
    Boolean(sessionId) &&
    (forcedSynthetic ||
      videoSource === 'clip' ||
      (videoSource === 'camera' && (!wantMediaPipe || mpStatus !== 'ready')));

  useSyntheticLoop(syntheticEnabled, onFrame);
  useFrameIngest(sessionId, frames);
  useSpeech(Boolean(sessionId), startedAtMs, appendTranscript, setInterim);

  const sourceLabel = forcedSynthetic
    ? 'synthetic (?synthetic=1)'
    : videoSource === 'camera' && mpStatus === 'ready'
      ? 'MediaPipe · 5 Hz'
      : videoSource === 'camera' && mpStatus === 'loading'
        ? 'MediaPipe loading…'
        : videoSource === 'camera'
          ? 'synthetic fallback · 5 Hz'
          : videoSource === 'clip'
            ? 'clip'
            : 'camera off';

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
    setLatest(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopTracks();
    setLatest(null);
    const url = URL.createObjectURL(file);
    setClipUrl(url);
    setVideoSource('clip');
  };

  const handleClearClip = () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl(null);
    setVideoSource('none');
    setLatest(null);
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

  const liveFrame = showLiveData ? latest : null;

  const confPct =
    liveFrame?.confidence === 'high'
      ? 88
      : liveFrame?.confidence === 'medium'
        ? 64
        : liveFrame
          ? 42
          : 0;

  const signalRows = [
    { label: 'Engagement', width: pct(liveFrame?.engagement), variant: 'accent' },
    { label: 'Attention', width: pct(liveFrame?.attention), variant: 'positive' },
    { label: 'Smile', width: pct(liveFrame?.signals?.smile), variant: 'positive' },
    {
      label: 'Gaze away',
      width: pct(liveFrame?.signals?.gazeAway),
      variant: (liveFrame?.signals?.gazeAway ?? 0) > 0.55 ? 'alert' : 'accent',
    },
  ];

  const emotionRows = useMemo(() => {
    if (!liveFrame?.emotions) return [] as Array<{ label: string; p: number }>;
    return (
      [
        { label: 'calm', p: liveFrame.emotions.calm },
        { label: 'happy', p: liveFrame.emotions.happy },
        { label: 'sad', p: liveFrame.emotions.sad },
        { label: 'tense', p: liveFrame.emotions.tense },
        { label: 'surprised', p: liveFrame.emotions.surprised },
        { label: 'uncertain', p: liveFrame.emotions.uncertain },
      ] as Array<{ label: string; p: number }>
    ).sort((a, b) => b.p - a.p);
  }, [liveFrame]);

  const talkStats = useMemo(() => {
    if (!showLiveData || frames.length < 5 || !liveFrame) return null;
    const window = frames.slice(-50);
    const talkingFrac =
      window.filter((f) => (f.signals?.talking ?? 0) > 0.35).length / window.length;
    let mono = 0;
    for (let i = frames.length - 1; i >= 0; i--) {
      if ((frames[i]?.signals?.talking ?? 0) > 0.35) mono += 0.2;
      else break;
    }
    return { talkShare: talkingFrac, floorSec: mono };
  }, [frames, liveFrame, showLiveData]);

  const recentNudges = [...nudges].reverse().slice(0, 5);

  return (
    <section className="pb-24 relative">
      <AnimatePresence>
        {activeToast && (
          <NudgeToast key={activeToast.id} nudge={activeToast} onDismiss={() => setToastId(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-2">
            Live Camera
          </h2>
          <p className="font-mono text-xs text-ink-3">
            {sourceLabel} · real-time analysis · strict local processing
          </p>
          {mpError && (
            <p className="text-xs text-alert mt-1" role="alert">
              MediaPipe: {mpError} — using synthetic signals
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {videoSource === 'none' && (
            <>
              <Button variant="primary" className="rounded-full px-6" onClick={() => void handleStartCamera()}>
                Start Live Camera
              </Button>
              <Button variant="default" className="rounded-full px-6" onClick={() => fileInputRef.current?.click()}>
                Upload Clip
              </Button>
            </>
          )}
          {videoSource === 'camera' && (
            <>
              <Button
                variant="default"
                className="rounded-full text-alert border-alert/20 hover:bg-alert/10"
                onClick={handleStopCamera}
              >
                Stop Camera
              </Button>
              <Button
                variant={meshOn ? 'primary' : 'default'}
                className="rounded-full"
                onClick={() => setMeshOn((v) => !v)}
              >
                Mesh {meshOn ? 'on' : 'off'}
              </Button>
            </>
          )}
          {videoSource === 'clip' && (
            <Button variant="default" className="rounded-full" onClick={handleClearClip}>
              Clear Clip
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-10 items-start max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-3.5">
          <div className="aspect-[4/3] bg-paper-2 border border-rule rounded-[2px] flex items-center justify-center relative overflow-hidden">
            {videoSource === 'none' && (
              <div className="text-center p-6">
                <p className="text-[15px] font-medium text-ink-2 mb-0.5">Camera feed</p>
                <p className="font-mono text-xs text-ink-3">start camera to begin tracking</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay={videoSource === 'camera'}
              muted={videoSource === 'camera'}
              controls={videoSource === 'clip'}
              src={videoSource === 'clip' && clipUrl ? clipUrl : undefined}
              className={`w-full h-full ${videoSource === 'clip' ? 'object-contain bg-black' : 'object-cover'} ${videoSource === 'camera' ? '-scale-x-100' : ''} ${videoSource === 'none' ? 'hidden' : 'block'}`}
              playsInline
            />
            {videoSource === 'camera' && (
              <canvas
                ref={setMeshCanvas}
                className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
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

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                {transcriptRows.length > 0
                  ? 'live captions · engagement at each line'
                  : 'live captions (Chrome)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={transcriptScrollRef}
                className="max-h-[220px] overflow-y-auto flex flex-col pr-1"
              >
                {transcriptRows.length === 0 && !interim ? (
                  <p className="text-[13px] text-ink-3">
                    Listening… your words appear here live with the engagement reading at the moment
                    you said them, so you can see where a conversation slipped.
                  </p>
                ) : (
                  <>
                    {transcriptRows.map(({ turn, engagement }, i) => {
                      const engPct = engagement == null ? null : Math.round(engagement * 100);
                      const variant =
                        engPct == null ? 'accent' : engPct < 40 ? 'alert' : engPct >= 55 ? 'positive' : 'accent';
                      return (
                        <div
                          key={`${turn.t}-${i}`}
                          className={`grid grid-cols-[46px_1fr_auto] gap-3 py-[11px] items-baseline border-b border-rule ${i === 0 ? 'pt-0' : ''}`}
                        >
                          <span className="font-mono text-xs text-ink-3">{formatTime(turn.t)}</span>
                          <span className="text-[13px] leading-normal">
                            {turn.speaker === 'partner' && (
                              <span className="font-mono text-[10px] text-ink-3 mr-1.5">them</span>
                            )}
                            {turn.text}
                          </span>
                          {engPct != null && (
                            <Badge variant={variant} size="sm" title="engagement at this moment">
                              {engPct}%
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {interim && (
                      <div className="grid grid-cols-[46px_1fr_auto] gap-3 py-[11px] items-baseline">
                        <span className="font-mono text-[10px] text-accent uppercase tracking-wide">
                          live
                        </span>
                        <span className="text-[13px] leading-normal italic text-ink-2">{interim}</span>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse self-center"
                          aria-hidden
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-[26px]">
          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
              <CardDescription>
                {liveFrame
                  ? `t = ${formatTime(liveFrame.t)} · 5 Hz`
                  : showLiveData
                    ? 'warming up'
                    : 'camera off'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showLiveData ? (
                <p className="text-[13px] text-ink-3">Start the camera to begin tracking.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-ink-2 mb-1.5">
                        Confidence{' '}
                        <Badge size="sm" variant="accent" className="ml-1">
                          {liveFrame?.confidence ?? '—'}
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
              {!showLiveData ? (
                <p className="text-[13px] text-ink-3">Waiting for camera…</p>
              ) : (
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>State probabilities</CardTitle>
              <CardDescription>experimental · soft distribution · not a diagnosis</CardDescription>
            </CardHeader>
            <CardContent>
              {!showLiveData || emotionRows.length === 0 ? (
                <p className="text-[13px] text-ink-3">
                  {!showLiveData ? 'Waiting for camera…' : 'Waiting for face signals…'}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {emotionRows.map(({ label, p }) => (
                    <div key={label} className="grid grid-cols-[88px_1fr_40px] items-center gap-2.5">
                      <span className="text-[13px] text-ink-2 capitalize">{label}</span>
                      <BarTrack
                        width={pct(p)}
                        variant={
                          label === 'happy' || label === 'calm'
                            ? 'positive'
                            : label === 'surprised'
                              ? 'accent'
                              : 'alert'
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
                  disabled={!liveFrame || nudgeBusy}
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

    </section>
  );
}
