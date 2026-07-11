import { useState, useRef, useCallback } from 'react'
import { statsData, type StatsChannel } from '../data/sessions'

const X0 = 44, X1 = 620
const yOf = (v: number) => 24 + (80 - v) * 4.4

interface TrendPoint {
  x: number
  y: number
  session: number
  value: number
}

function buildTrendPoints(values: readonly number[]): TrendPoint[] {
  return values.map((v, i) => ({
    x: X0 + i * (X1 - X0) / 11,
    y: yOf(v),
    session: i + 1,
    value: v,
  }))
}

const CHANNELS: { key: StatsChannel; label: string }[] = [
  { key: 'all', label: 'All signals' },
  { key: 'visual', label: 'Visual · face & body' },
  { key: 'audio', label: 'Audio · speech' },
]

const POSITIVE_EMOTIONS = ['warmth', 'trust', 'interest', 'ease'] as const
const WATCH_EMOTIONS = ['tension', 'confusion'] as const

export default function StatsView() {
  const [channel, setChannel] = useState<StatsChannel>('all')
  const data = statsData[channel]
  const points = buildTrendPoints(data.trend)
  const last = points[points.length - 1]

  const [hover, setHover] = useState<TrendPoint | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const vx = (e.clientX - r.left) * 648 / r.width
    let nearest = points[0]
    for (const p of points) {
      if (Math.abs(p.x - vx) < Math.abs(nearest.x - vx)) nearest = p
    }
    setHover(nearest)
  }, [points])

  const lineStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaStr = lineStr + ' 620,200 44,200'

  return (
    <section>
      <div className="mb-[26px]">
        <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">How people experience you</h2>
        <p className="font-mono text-xs text-ink-3 mt-1">across 12 practice sessions · last 30 days</p>
      </div>

      {/* Channel filter */}
      <div className="flex gap-2 mb-[30px] flex-wrap" role="group" aria-label="Signal channel">
        {CHANNELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setChannel(key)}
            className={`font-sans text-xs font-medium py-[5px] px-3.5 rounded-[2px] cursor-pointer border ${
              channel === key
                ? 'bg-ink border-ink text-paper'
                : 'bg-transparent border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
            } focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI band */}
      <div className="grid grid-cols-4 border-t-[1.5px] border-t-rule-strong border-b border-b-rule mb-[34px] max-[900px]:grid-cols-2">
        <StatTile label="Overall perception" value={<>{last.value}<span className="text-[15px] font-normal text-ink-3 ml-[3px]">/100</span></>} delta="+8 vs first 4 sessions" deltaType="up" first />
        <StatTile label="Sessions analyzed" value="12" delta="last 30 days" deltaType="flat" />
        <StatTile label="Average engagement" value={<>64<span className="text-[15px] font-normal text-ink-3 ml-[3px]">%</span></>} delta="+5 vs last month" deltaType="up" />
        <StatTile label="Alerts per session" value="2.1" delta="−0.8, improving" deltaType="up" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-[34px] max-[900px]:grid-cols-1">
        {/* Trend chart */}
        <div className="col-span-full bg-transparent border-t border-rule-strong">
          <div className="flex items-baseline justify-between py-2.5 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink">Perception score over sessions</span>
            <span className="font-mono text-[11px] text-ink-3">12 sessions</span>
          </div>
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox="0 0 648 240"
              className="block w-full h-auto"
              role="img"
              aria-label={`Line chart of perception score across 12 sessions`}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHover(null)}
            >
              {[200, 156, 112, 68, 24].map(y => (
                <line key={y} x1="44" y1={y} x2="620" y2={y} stroke="#E3DFD4" strokeWidth="1" />
              ))}
              {[40, 50, 60, 70, 80].map((v, i) => (
                <text key={v} x="36" y={204 - i * 44} textAnchor="end" fontSize="10" fill="#A39D8E" fontFamily="IBM Plex Mono, monospace">{v}</text>
              ))}
              {[[44, '1'], [201, '4'], [410, '8'], [620, '12']].map(([x, l]) => (
                <text key={l as string} x={x as number} y={222} textAnchor="middle" fontSize="10" fill="#A39D8E" fontFamily="IBM Plex Mono, monospace">{l as string}</text>
              ))}
              <text x={332} y={238} textAnchor="middle" fontSize="10" fill="#A39D8E" fontFamily="IBM Plex Mono, monospace">session</text>

              <polygon points={areaStr} fill="#2F4E87" opacity="0.08" />
              <polyline points={lineStr} fill="none" stroke="#2F4E87" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

              {hover && (
                <>
                  <line x1={hover.x} y1={24} x2={hover.x} y2={200} stroke="#A39D8E" strokeWidth="1" />
                  <circle cx={hover.x} cy={hover.y} r={5} fill="#2F4E87" stroke="#F7F5F0" strokeWidth={2} />
                </>
              )}

              <circle cx={last.x} cy={last.y} r={4.5} fill="#2F4E87" stroke="#F7F5F0" strokeWidth={2} />
              <text x={last.x - 6} y={last.y - 11} textAnchor="end" fontSize="12" fontWeight="500" fill="#26241F" fontFamily="IBM Plex Mono, monospace">{last.value}</text>
            </svg>

            {hover && (
              <div
                className="absolute bg-paper border border-ink-3 rounded-[2px] py-[5px] px-2.5 font-mono text-[11px] text-ink pointer-events-none whitespace-nowrap -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${hover.x / 648 * 100}%`,
                  top: `${hover.y / 240 * 100}%`,
                  marginTop: -10,
                }}
              >
                session {hover.session} — <strong className="font-medium">{hover.value}</strong>
              </div>
            )}
          </div>

          <details className="mt-3">
            <summary className="font-mono text-[11px] text-ink-3 cursor-pointer hover:text-ink-2">View data as table</summary>
            <table className="border-collapse mt-2 font-mono text-xs">
              <thead>
                <tr>
                  <th className="text-left pr-[18px] pb-1 font-medium text-ink border-b border-rule">Session</th>
                  <th className="text-left pr-[18px] pb-1 font-medium text-ink border-b border-rule">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.trend.map((v, i) => (
                  <tr key={i}>
                    <td className="text-left pr-[18px] py-1 text-ink-2 border-b border-rule">{i + 1}</td>
                    <td className="text-left pr-[18px] py-1 text-ink-2 border-b border-rule">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        {/* Emotions */}
        <div className="bg-transparent border-t border-rule-strong">
          <div className="flex items-baseline justify-between py-2.5 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink">Emotions you evoke</span>
            <span className="font-mono text-[11px] text-ink-3">avg across sessions</span>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">People felt</div>
            {POSITIVE_EMOTIONS.map(key => (
              <EmotionRow key={key} label={key} value={data.emotions[key]} color="accent" />
            ))}
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 mt-1.5">Watch areas</div>
            {WATCH_EMOTIONS.map(key => (
              <EmotionRow key={key} label={key} value={data.emotions[key]} color="warn" />
            ))}
          </div>
        </div>

        {/* Focus cards */}
        <div className="bg-transparent border-t border-rule-strong">
          <div className="flex items-baseline justify-between py-2.5 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink">What to focus on</span>
            <span className="font-mono text-[11px] text-ink-3">from your last 12 sessions</span>
          </div>
          <div className="flex flex-col gap-3.5">
            <FocusCard type="work" title="Give space before topic changes" text="Tension rose right after quick topic switches in 4 of your 6 alerts. Try pausing two to three seconds before moving to something new." />
            <FocusCard type="work" title="Re-engage around the 2-minute mark" text="Interest dips most between minutes 2 and 3. In three sessions, a follow-up question at that point brought engagement back up." />
            <FocusCard type="strength" title="Keep your warm openings" text="Warmth peaks in your first minute of every session. Your openings work — carry that same energy into topic changes." />
          </div>
        </div>
      </div>
    </section>
  )
}

function StatTile({ label, value, delta, deltaType, first }: {
  label: string
  value: React.ReactNode
  delta: string
  deltaType: 'up' | 'down' | 'flat'
  first?: boolean
}) {
  const deltaColor = { up: 'text-positive', down: 'text-alert', flat: 'text-ink-3' }[deltaType]
  return (
    <div className={`py-[18px] pr-5 pl-5 ${!first ? 'border-l border-rule' : 'pl-0'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 mb-2.5">{label}</div>
      <div className="text-[42px] font-light tracking-[-1.5px] leading-none">{value}</div>
      <div className={`font-mono text-[11px] mt-2.5 ${deltaColor}`}>{delta}</div>
    </div>
  )
}

function EmotionRow({ label, value, color }: { label: string; value: number; color: 'accent' | 'warn' }) {
  return (
    <div className="grid grid-cols-[88px_1fr_40px] items-center gap-3">
      <span className="text-[13px] text-ink-2 capitalize">{label}</span>
      <div className="h-3 bg-bar-track rounded-[1px] overflow-hidden">
        <div className={`h-full ${color === 'accent' ? 'bg-accent' : 'bg-warn'}`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">{value}</span>
    </div>
  )
}

function FocusCard({ type, title, text }: { type: 'work' | 'strength'; title: string; text: string }) {
  const chipColors = type === 'work' ? 'bg-warn-soft text-warn' : 'bg-positive-soft text-positive'
  const chipLabel = type === 'work' ? 'Work on' : 'Strength'
  return (
    <div className="relative bg-paper-2 rounded-[2px] py-3.5 px-4">
      <span className={`absolute top-3.5 right-3.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] py-[3px] px-2 rounded-[2px] ${chipColors}`}>
        {chipLabel}
      </span>
      <div className="text-sm font-semibold mb-[5px] pr-[90px]">{title}</div>
      <p className="text-[13px] text-ink-2 leading-[1.65]">{text}</p>
    </div>
  )
}
