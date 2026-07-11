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
import { requestNudge } from '@/api/nudge';

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
  } = useSession();

  const [videoSource, setVideoSource] = useState<'none' | 'camera' | 'clip'>('none');
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [latest, setLatest] = useState<SignalFrame | null>(null);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [toastId, setToastId] = useState<string | null>(null);
  const [nudgeError, setNudgeError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const onFrame = useCallback(
    (frame: SignalFrame) => {
      setLatest(frame);
      appendFrames([frame]);
    },
    [appendFrames],
  );

  const wantSynthetic =
    forceSynthetic() || videoSource !== 'camera' || !sessionId;
  const wantMediaPipe =
    Boolean(sessionId) && videoSource === 'camera' && !forceSynthetic();

  const { status: mpStatus, error: mpError } = useMediaPipe({
    enabled: wantMediaPipe,
    video: videoEl,
    startedAtMs,
    onFrame,
  });

  // Synthetic fills in when camera is off, ?synthetic=1, or MediaPipe not ready/error
  const syntheticOn =
    Boolean(sessionId) &&
    (wantSynthetic || mpStatus === 'error' || (wantMediaPipe && mpStatus !== 'ready'));

  useSyntheticLoop(syntheticOn && (wantSynthetic || mpStatus !== 'ready'), onFrame);
  useFrameIngest(sessionId, frames);

  const sourceLabel = forceSynthetic()
    ? 'synthetic (?synthetic=1)'
    : videoSource === 'camera' && mpStatus === 'ready'
      ? 'MediaPipe'
      : videoSource === 'camera' && mpStatus === 'loading'
        ? 'MediaPipe loading…'
        : 'synthetic fallback';

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
    setNudgeBusy(true);
    setNudgeError(null);
    const evidence = [
      `engagement ~${pct(latest.engagement)}%`,
      `attention ~${pct(latest.attention)}%`,
      ...(latest.signals?.gazeAway != null
        ? [`gazeAway ~${pct(latest.signals.gazeAway)}%`]
        : []),
    ].slice(0, 12);
    try {
      const res = await requestNudge({
        sessionId: sessionId ?? undefined,
        context: context.trim() || undefined,
        confidence: latest.confidence ?? 'medium',
        evidence,
        recentFrames: frames.slice(-5),
      });
      pushNudge(res, latest.t);
      setToastId(`${Date.now()}`);
    } catch (err) {
      setNudgeError(err instanceof Error ? err.message : 'Nudge failed');
    } finally {
      setNudgeBusy(false);
    }
  };

  const activeToast = useMemo(() => {
    if (!toastId) return null;
    const last = nudges[nudges.length - 1];
    if (!last) return null;
    return { ...last, id: toastId };
  }, [nudges, toastId]);

  const confPct =
    latest?.confidence === 'high' ? 88 : latest?.confidence === 'medium' ? 64 : latest ? 42 : 0;

  const signalRows = [
    { label: 'Engagement', width: pct(latest?.engagement), variant: 'accent' },
    { label: 'Attention', width: pct(latest?.attention), variant: 'positive' },
    {
      label: 'Gaze away',
      width: pct(latest?.signals?.gazeAway),
      variant: (latest?.signals?.gazeAway ?? 0) > 0.55 ? 'alert' : 'accent',
    },
  ];

  const recentNudges = [...nudges].reverse().slice(0, 5);

  return (
    <section>
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">Live session</h2>
          <p className="font-mono text-xs text-ink-3 mt-1">
            {sourceLabel} · press B to dip (synthetic) · video stays on device
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
              <Button
                variant="default"
                className="flex-1 text-alert border-alert/20 hover:bg-alert/10"
                onClick={handleStopCamera}
              >
                Stop Camera
              </Button>
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
              <CardDescription>{latest ? `t = ${formatTime(latest.t)}` : 'warming up'}</CardDescription>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
              <CardDescription>descriptors only — never emotion labels</CardDescription>
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
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  disabled={!latest || nudgeBusy}
                  onClick={() => void handleNudge()}
                >
                  {nudgeBusy ? 'Requesting…' : 'Request nudge'}
                </Button>
                {nudgeError && (
                  <p className="text-xs text-alert" role="alert">
                    {nudgeError}
                  </p>
                )}
                <p className="font-mono text-[10px] text-ink-3">
                  Auto event engine lands in Phase 4. Press B to simulate a dip.
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
