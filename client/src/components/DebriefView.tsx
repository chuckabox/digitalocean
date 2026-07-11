import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { analyzeSession } from 'shared';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useSession } from '@/session/SessionContext';
import { streamDebrief } from '@/api/debrief';
import { ingestFrames } from '@/api/frames';

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DebriefView() {
  const { sessionId, context, frames, nudges, transcript, reset, startSession, starting } =
    useSession();
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function run() {
      if (sessionId && frames.length > 0) {
        try {
          // best-effort flush leftover frames
          for (let i = 0; i < frames.length; i += 120) {
            await ingestFrames({
              sessionId,
              frames: frames.slice(i, i + 120),
            });
          }
        } catch (err) {
          console.warn('flush frames', err);
        }
      }

      try {
        await streamDebrief(
          {
            sessionId: sessionId ?? undefined,
            context: context.trim() || undefined,
            transcript: transcript.length ? transcript : undefined,
            frames: frames.length ? frames : undefined,
            tier: 'smart',
          },
          {
            onDelta: (chunk) => {
              if (!cancelled) setText((prev) => prev + chunk);
            },
            onDone: () => {
              if (!cancelled) {
                setDone(true);
                setStreaming(false);
              }
            },
            onError: (message) => {
              if (!cancelled) {
                setError(message);
                setStreaming(false);
              }
            },
          },
          ac.signal,
        );
        if (!cancelled) {
          setDone(true);
          setStreaming(false);
        }
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Debrief failed');
          setStreaming(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analysis = useMemo(
    () => analyzeSession(frames, transcript),
    [frames, transcript],
  );

  const hasArousal = useMemo(
    () => frames.some((f) => typeof f.signals?.arousal === 'number'),
    [frames],
  );

  const chartData = useMemo(
    () =>
      frames.map((f) => ({
        t: f.t,
        engagement: Math.round((f.engagement ?? 0) * 100),
        attention: Math.round((f.attention ?? 0) * 100),
        arousal:
          typeof f.signals?.arousal === 'number'
            ? Math.round(f.signals.arousal * 100)
            : null,
      })),
    [frames],
  );

  const meanEng =
    frames.length === 0
      ? 0
      : frames.reduce((s, f) => s + (f.engagement ?? 0), 0) / frames.length;

  return (
    <section className="pb-24">
      <div className="mb-10">
        <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-2">
          Session debrief
        </h2>
        <p className="font-mono text-xs text-ink-3">
          Engagement over time with suggestion markers · AI summary streams from Claude on DigitalOcean Gradient
        </p>
      </div>

      {analysis.theTell ? (
        <div className="border border-alert/40 bg-alert/5 rounded-[3px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-alert">
              The Tell
            </span>
            <Badge variant="alert" size="sm">
              t = {formatTime(analysis.theTell.t)}
            </Badge>
            <span className="font-mono text-[10px] text-ink-3 uppercase tracking-wide">
              face vs body · experimental
            </span>
          </div>
          <p className="text-[17px] leading-snug text-ink font-light">
            The body moved while the face held steady — {analysis.theTell.bodyDesc}, while
            the {analysis.theTell.faceDesc}.
          </p>
          <p className="font-mono text-[11px] text-ink-3 mt-2">
            The clearest divergence between the voluntary channel (expression) and the
            involuntary one (arousal). A signal worth noticing — not a verdict.
          </p>
        </div>
      ) : (
        hasArousal && (
          <p className="font-mono text-xs text-ink-3">
            No strong face/body divergence stood out this session — the two channels
            largely tracked together.
          </p>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 items-start mb-10">
        <div className="flex flex-col gap-4">
          <div className="h-64 w-full border border-rule bg-paper-2 p-3">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-ink-3">
                No frames recorded for this session.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#DAD5C8" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={formatTime}
                    stroke="#A39D8E"
                    fontSize={11}
                  />
                  <YAxis domain={[0, 100]} stroke="#A39D8E" fontSize={11} width={32} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'engagement']}
                    labelFormatter={(label) => formatTime(Number(label))}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#2F4E87"
                    fill="#E4E9F4"
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                  {hasArousal && (
                    <Area
                      type="monotone"
                      dataKey="arousal"
                      stroke="#B04A3C"
                      fill="none"
                      strokeWidth={1.25}
                      strokeDasharray="2 2"
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}
                  {analysis.theTell && (
                    <ReferenceLine
                      x={analysis.theTell.t}
                      stroke="#B04A3C"
                      strokeWidth={1.5}
                      label={{ value: 'the tell', fill: '#B04A3C', fontSize: 10, position: 'top' }}
                    />
                  )}
                  {nudges.map((n) => (
                    <ReferenceLine
                      key={n.id}
                      x={n.t}
                      stroke="#A39D8E"
                      strokeDasharray="4 4"
                      label={{ value: 'suggestion', fill: '#A39D8E', fontSize: 10 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {hasArousal && (
            <div className="flex items-center gap-4 font-mono text-[10px] text-ink-3 -mt-1">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-[2px] bg-accent" /> engagement
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0 border-t-[1.5px] border-dashed border-alert" />{' '}
                arousal (rPPG · experimental)
              </span>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div className="border border-rule p-3">
              <dt className="text-ink-3 text-xs mb-1">Mean engagement</dt>
              <dd className="font-mono text-ink">{Math.round(meanEng * 100)}%</dd>
            </div>
            <div className="border border-rule p-3">
              <dt className="text-ink-3 text-xs mb-1">Frames</dt>
              <dd className="font-mono text-ink">{frames.length}</dd>
            </div>
            <div className="border border-rule p-3">
              <dt className="text-ink-3 text-xs mb-1">Friction</dt>
              <dd className="font-mono text-ink">{nudges.length}</dd>
            </div>
          </dl>

          {analysis.moments.length > 0 && (
            <div>
              <p className="font-mono text-[11px] tracking-[0.06em] uppercase text-ink-3 mb-2">
                Moments the signals flagged
              </p>
              <ul className="flex flex-col border border-rule divide-y divide-rule">
                {analysis.moments.map((m, i) => (
                  <li key={`${m.t}-${m.channel}-${i}`} className="px-3 py-2.5 flex gap-3 items-start">
                    <span className="font-mono text-xs text-ink-3 shrink-0 w-9">
                      {formatTime(m.t)}
                    </span>
                    <span className="text-[13px] text-ink flex-1">
                      <span className="capitalize">{m.channel}</span>{' '}
                      {m.direction === 'rise' ? 'rose' : 'dropped'}{' '}
                      {Math.round(m.before * 100)}
                      {m.channel === 'valence' ? '' : '%'} →{' '}
                      {Math.round(m.after * 100)}
                      {m.channel === 'valence' ? '' : '%'}
                      {m.coText && (
                        <span className="text-ink-3">
                          {' '}
                          · “{m.coText.length > 60 ? m.coText.slice(0, 59) + '…' : m.coText}”
                        </span>
                      )}
                    </span>
                    <Badge variant={m.direction === 'fall' ? 'alert' : 'accent'} size="sm">
                      {m.direction}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nudges.length > 0 && (
            <ul className="flex flex-col border border-rule divide-y divide-rule">
              {nudges.map((n) => (
                <li key={n.id} className="px-3 py-2.5 flex gap-3 items-start">
                  <span className="font-mono text-xs text-ink-3 shrink-0">{formatTime(n.t)}</span>
                  <span className="text-[13px] text-ink flex-1">{n.text}</span>
                  <Badge variant="accent" size="sm">
                    {n.confidence}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[16px] font-medium text-ink">AI debrief</h2>
            <Badge variant={streaming ? 'accent' : done ? 'positive' : 'alert'} size="sm">
              {streaming ? 'streaming' : done ? 'complete' : 'error'}
            </Badge>
          </div>
          <p className="font-mono text-[10px] tracking-[0.04em] text-ink-3 uppercase">
            Generated by Claude on DigitalOcean Gradient
          </p>
          <div className="min-h-[220px] border border-rule bg-paper p-4 text-[15px] leading-relaxed text-ink font-light whitespace-pre-wrap">
            {text || (streaming ? '…' : 'No debrief text.')}
            {streaming && <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse" />}
          </div>
          {error && (
            <p className="text-sm text-alert" role="alert">
              {error}
            </p>
          )}
          {transcript.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <h3 className="text-[14px] font-medium text-ink">Transcript</h3>
              <div className="border border-rule bg-paper p-4 max-h-[300px] overflow-auto flex flex-col gap-3 rounded-[3px]">
                {transcript.map((turn, i) => (
                  <div key={`${turn.t}-${i}`} className="flex items-start gap-3">
                    <span className="font-mono text-xs text-ink-3 shrink-0 pt-0.5">
                      {formatTime(turn.t)}
                    </span>
                    <span className="text-[13px] leading-relaxed text-ink font-light">
                      <span className="font-medium capitalize text-ink-2 mr-2">
                        {turn.speaker}:
                      </span>
                      {turn.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" onClick={reset}>
          Home
        </Button>
        <Button
          variant="primary"
          disabled={starting}
          onClick={() => void startSession()}
        >
          {starting ? 'Starting…' : 'New session'}
        </Button>
      </div>
    </section>
  );
}
