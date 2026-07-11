import { useEffect, useRef, useState } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { SignalFrame } from 'shared';
import { blendshapeMap, deriveRawSignals } from './deriveSignals';
import { createEngagementState, updateEngagement, type EngagementState } from './engagement';
import { estimateEmotion } from './estimateEmotion';
import { drawFaceMesh } from './drawFaceMesh';
import {
  createRppgState,
  pushRppgSample,
  rppgReading,
  updateRppg,
  type RppgState,
} from './rppg';
import { sampleRoiGreen } from './roiSampler';

export type PulseReading = {
  waveform: number[];
  bpm: number | null;
  conf: number;
  arousal: number;
  hasBaseline: boolean;
};

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Emit SignalFrames at 5 Hz (every 200 ms). */
const EMIT_INTERVAL_S = 0.2;

type Options = {
  enabled: boolean;
  video: HTMLVideoElement | null;
  startedAtMs: number | null;
  onFrame: (frame: SignalFrame) => void;
  /** When set and meshEnabled, draw a light landmark overlay into this canvas. */
  meshCanvas?: HTMLCanvasElement | null;
  meshEnabled?: boolean;
};

/**
 * Runs Face Landmarker ~12 Hz when `enabled` and video has a stream.
 * Emits ~5 Hz SignalFrames via onFrame (downsampled).
 */
export function useMediaPipe({
  enabled,
  video,
  startedAtMs,
  onFrame,
  meshCanvas = null,
  meshEnabled = true,
}: Options) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const engRef = useRef<EngagementState>(createEngagementState());
  const rppgRef = useRef<RppgState>(createRppgState());
  const pulseRef = useRef<PulseReading>({
    waveform: [],
    bpm: null,
    conf: 0,
    arousal: 0.5,
    hasBaseline: false,
  });
  const lastVideoTime = useRef(-1);
  const lastEmitT = useRef(-Infinity);
  const prevLandmarks = useRef<Array<{ x: number; y: number }> | null>(null);
  const motionEma = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const startedRef = useRef(startedAtMs);
  startedRef.current = startedAtMs;
  const meshCanvasRef = useRef(meshCanvas);
  meshCanvasRef.current = meshCanvas;
  const meshEnabledRef = useRef(meshEnabled);
  meshEnabledRef.current = meshEnabled;
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setError(null);
    engRef.current = createEngagementState();
    rppgRef.current = createRppgState();
    prevLandmarks.current = null;
    motionEma.current = 0;
    lastEmitT.current = -Infinity;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setStatus('ready');
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'MediaPipe failed to load');
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      const canvas = meshCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || status !== 'ready' || !video) return;

    const loop = () => {
      const lm = landmarkerRef.current;
      const el = video;
      if (lm && el && el.readyState >= 2) {
        if (el.currentTime !== lastVideoTime.current) {
          lastVideoTime.current = el.currentTime;
          const now = performance.now();
          let result: FaceLandmarkerResult | undefined;
          try {
            result = lm.detectForVideo(el, now);
          } catch (err) {
            console.warn('detectForVideo', err);
          }
          if (result) processResult(result, el);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    const processResult = (result: FaceLandmarkerResult, el: HTMLVideoElement) => {
      const t0 = startedRef.current ?? Date.now();
      const t = (Date.now() - t0) / 1000;
      const facePresent = (result.faceLandmarks?.length ?? 0) > 0;
      const landmarks = result.faceLandmarks?.[0];

      const canvas = meshCanvasRef.current;
      if (canvas && meshEnabledRef.current && landmarks && facePresent) {
        const w = el.clientWidth || el.videoWidth;
        const h = el.clientHeight || el.videoHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) drawFaceMesh(ctx, landmarks, w, h);
      } else if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }

      const cats = result.faceBlendshapes?.[0]?.categories;
      const shapes = blendshapeMap(cats);
      const matrix = result.facialTransformationMatrixes?.[0]?.data as number[] | undefined;
      const raw = deriveRawSignals(shapes, matrix);

      const { state, frame } = updateEngagement(engRef.current, {
        t,
        ...raw,
        facePresent,
      });
      engRef.current = state;

      // rPPG — the involuntary "body" channel. Sample the skin ROI every frame
      // (not just at emit cadence) for temporal resolution, then read the pulse.
      if (facePresent && landmarks) {
        const green = sampleRoiGreen(el, landmarks);
        if (green != null) {
          pushRppgSample(rppgRef.current, t, green);
          updateRppg(rppgRef.current, t);
        }
      }
      const rp = rppgReading(rppgRef.current);
      pulseRef.current = { ...rp, waveform: rppgRef.current.waveform };

      // Motion energy (MEA-style frame differencing): mean landmark displacement
      // frame-to-frame. Substrate for the attunement / responsiveness read.
      let motionEnergy = motionEma.current;
      if (landmarks && facePresent) {
        const prev = prevLandmarks.current;
        if (prev && prev.length === landmarks.length) {
          let sum = 0;
          let count = 0;
          for (let i = 0; i < landmarks.length; i += 8) {
            const a = landmarks[i]!;
            const b = prev[i]!;
            sum += Math.hypot(a.x - b.x, a.y - b.y);
            count++;
          }
          const raw = count > 0 ? (sum / count) * 30 : 0; // gain into ~0–1
          motionEma.current = motionEma.current * 0.7 + Math.min(1, raw) * 0.3;
          motionEnergy = motionEma.current;
        }
        prevLandmarks.current = landmarks.map((p) => ({ x: p.x, y: p.y }));
      }

      const emotions = estimateEmotion(raw);

      if (facePresent && t - lastEmitT.current >= EMIT_INTERVAL_S) {
        lastEmitT.current = t;
        onFrameRef.current({
          ...frame,
          emotions,
          signals: {
            ...frame.signals,
            emotionCalm: emotions.calm,
            emotionPositive: emotions.positive,
            emotionTense: emotions.tense,
            emotionUncertain: emotions.uncertain,
            motionEnergy,
            ...(rp.bpm != null
              ? { bpm: rp.bpm, pulseConf: rp.conf, arousal: rp.arousal }
              : {}),
          },
          t: Math.round(t * 1000) / 1000,
        });
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, status, video]);

  return { status, error, pulseRef };
}
