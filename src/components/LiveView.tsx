interface LiveViewProps {
  onGoToTimeline: () => void
}

function BarTrack({ width, variant }: { width: number; variant: string }) {
  const colors: Record<string, string> = {
    accent: 'bg-accent',
    alert: 'bg-alert',
    positive: 'bg-positive',
  }
  return (
    <div className="flex-1 h-[5px] bg-bar-track rounded-[1px] overflow-hidden">
      <div className={`h-full ${colors[variant] ?? 'bg-accent'}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function AudioMeter({
  label,
  value,
  bandLeft,
  bandWidth,
  markerLeft,
  status,
  warn,
}: {
  label: string
  value: string
  bandLeft: number
  bandWidth: number
  markerLeft: number
  status: string
  warn?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className={`font-mono text-[13px] font-medium ${warn ? 'text-alert' : 'text-ink'}`}>
          {value}
        </span>
      </div>
      <div className="relative h-2 bg-bar-track rounded-[1px]">
        <div
          className={`absolute top-0 h-full rounded-[1px] ${warn ? 'bg-alert-soft' : 'bg-accent-soft'}`}
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        <div
          className={`absolute -top-0.5 w-0.5 h-3 rounded-[1px] -translate-x-px ${warn ? 'bg-alert' : 'bg-ink'}`}
          style={{ left: `${markerLeft}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] tracking-[0.02em] ${warn ? 'text-alert' : 'text-ink-3'}`}>
        {status}
      </span>
    </div>
  )
}

export default function LiveView({ onGoToTimeline }: LiveViewProps) {
  return (
    <section>
      <div className="mb-[26px]">
        <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">Live session</h2>
        <p className="font-mono text-xs text-ink-3 mt-1">
          real-time cue reading · camera and audio stay on this device
        </p>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-10 items-start max-[900px]:grid-cols-1">
        {/* Camera */}
        <div className="flex flex-col gap-3.5">
          <div className="aspect-[4/3] bg-paper-2 border border-rule rounded-[2px] flex items-center justify-center">
            <div className="text-center p-6">
              <div className="mb-3">
                <svg viewBox="0 0 24 24" className="w-[30px] h-[30px] stroke-ink-3 fill-none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="15" height="13" rx="1" />
                  <path d="M17 10l4-2.5v9L17 14" />
                </svg>
              </div>
              <p className="text-[15px] font-medium text-ink-2 mb-0.5">Camera feed</p>
              <p className="font-mono text-xs text-ink-3">press start to begin reading</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button className="flex-1 font-sans text-[13px] font-medium py-[9px] px-5 bg-ink text-paper border border-ink rounded-[2px] cursor-pointer tracking-[0.02em] hover:bg-[#3A362E] hover:border-[#3A362E]">
              Start
            </button>
            <button className="flex-1 font-sans text-[13px] font-medium py-[9px] px-5 bg-transparent text-ink border border-ink-3 rounded-[2px] cursor-pointer tracking-[0.02em] hover:bg-paper-2 hover:border-ink-2">
              Upload Clip
            </button>
          </div>
        </div>

        {/* Panels */}
        <div className="flex flex-col gap-[26px]">
          {/* Detected Face */}
          <Panel title="Detected Face" meta="1 subject">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 border border-rule rounded-[2px] bg-paper-2 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]">
                  <circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" className="text-ink-3" strokeWidth="1.25" />
                  <ellipse cx="12" cy="21" rx="7" ry="5.5" fill="none" stroke="currentColor" className="text-ink-3" strokeWidth="1.25" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-ink-2 mb-1.5">Confidence</div>
                <div className="flex items-center gap-3">
                  <BarTrack width={78} variant="accent" />
                  <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">78%</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Interpretation */}
          <Panel title="Interpretation" meta="2s ago">
            <p className="text-base leading-[1.75] font-light">
              She crossed her arms and is giving shorter answers. This often signals{' '}
              <span className="bg-accent-soft text-accent font-medium px-1.5 rounded-[2px]">disengagement</span>{' '}
              or discomfort with the current topic. Consider shifting to an open-ended question.
            </p>
            <span className="inline-block font-mono text-[11px] font-medium py-1 px-2.5 rounded-[2px] mt-3.5 bg-accent-soft text-accent">
              disengagement
            </span>
          </Panel>

          {/* Signals + Audio side by side */}
          <div className="grid grid-cols-2 gap-8 max-[560px]:grid-cols-1 max-[560px]:gap-[26px]">
            <Panel title="Signals">
              <div className="flex flex-col gap-3.5">
                {[
                  { label: 'Happiness', width: 35, variant: 'positive' },
                  { label: 'Tension', width: 62, variant: 'alert' },
                  { label: 'Interest', width: 28, variant: 'accent' },
                ].map((s) => (
                  <div key={s.label} className="grid grid-cols-[76px_1fr_40px] items-center gap-2.5">
                    <span className="text-[13px] text-ink-2">{s.label}</span>
                    <BarTrack width={s.width} variant={s.variant} />
                    <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">{s.width}%</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Audio">
              <div className="flex flex-col gap-4">
                <AudioMeter label="Tone variation" value="12%" bandLeft={15} bandWidth={55} markerLeft={12} status="below typical range (15–70%)" />
                <AudioMeter label="Pace" value="96 wpm" bandLeft={20} bandWidth={47} markerLeft={16} status="slowing · typical 120–180 wpm" warn />
                <AudioMeter label="Volume" value="58%" bandLeft={30} bandWidth={40} markerLeft={58} status="dropping · was 74% at start" warn />
              </div>
              <p className="font-mono text-[10px] text-ink-3 leading-normal mt-2.5 pt-2.5 border-t border-rule">
                Typical range is a guide, not a goal. Being outside it isn't bad on its own — it's a cue to notice.
              </p>
            </Panel>
          </div>

          {/* Live Timeline */}
          <Panel title="Timeline" action={<button onClick={onGoToTimeline} className="font-sans text-xs font-medium text-accent bg-transparent border-none cursor-pointer p-0 hover:underline">View full timeline</button>}>
            <div className="flex flex-col">
              {[
                { time: '0:18', desc: 'Vocal pace slowing, volume drop', chan: 'Audio', kind: 'Note', kindClass: 'bg-neutral-soft text-ink-3' },
                { time: '0:12', desc: 'Disengagement signals detected', chan: 'Visual', kind: 'Alert', kindClass: 'bg-alert-soft text-alert' },
                { time: '0:08', desc: 'Active listening, leaning in', chan: 'Visual', kind: 'Positive', kindClass: 'bg-positive-soft text-positive' },
              ].map((ev, i, arr) => (
                <div
                  key={ev.time}
                  className={`grid grid-cols-[46px_1fr_auto] gap-3 py-[11px] items-center ${i < arr.length - 1 ? 'border-b border-rule' : ''} ${i === 0 ? 'pt-0' : ''} ${i === arr.length - 1 ? 'pb-0' : ''}`}
                >
                  <span className="font-mono text-xs text-ink-3">{ev.time}</span>
                  <span className="text-[13px] leading-normal">{ev.desc}</span>
                  <span className="flex gap-1.5">
                    <span className="font-mono text-[10px] font-medium py-[3px] px-2 rounded-[2px] border border-rule text-ink-3">{ev.chan}</span>
                    <span className={`font-mono text-[10px] font-medium py-[3px] px-2 rounded-[2px] ${ev.kindClass}`}>{ev.kind}</span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  )
}

function Panel({
  title,
  meta,
  action,
  children,
}: {
  title: string
  meta?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-transparent border-t border-rule-strong">
      <div className="flex items-baseline justify-between py-2.5 pb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink">{title}</span>
        {meta && <span className="font-mono text-[11px] text-ink-3">{meta}</span>}
        {action}
      </div>
      <div className="pb-1">{children}</div>
    </div>
  )
}
