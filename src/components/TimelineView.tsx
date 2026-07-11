import { useState, useMemo } from 'react'
import { sessionEvents, isoDate, addDays, type SessionEvent } from '../data/sessions'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = new Date()

type KindFilter = 'all' | 'positive' | 'alert' | 'note'
type ChannelFilter = 'all' | 'visual' | 'audio'

const KIND_MAP: Record<string, { label: string; cls: string }> = {
  positive: { label: 'Positive', cls: 'bg-positive-soft text-positive' },
  alert: { label: 'Alert', cls: 'bg-alert-soft text-alert' },
  note: { label: 'Note', cls: 'bg-neutral-soft text-ink-3' },
}

export default function TimelineView() {
  const [selectedDate, setSelectedDate] = useState(isoDate(today))
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')

  const session = sessionEvents[selectedDate]

  const filteredEvents = useMemo(() => {
    if (!session) return []
    return session.events.filter((ev: SessionEvent) => {
      const kindOk = kindFilter === 'all' || ev.kind === kindFilter
      const chanOk = channelFilter === 'all' || ev.channel === channelFilter
      return kindOk && chanOk
    })
  }, [session, kindFilter, channelFilter])

  const summary = useMemo(() => {
    if (!session) return null
    const evts = session.events
    return {
      total: evts.length,
      visual: evts.filter(e => e.channel === 'visual').length,
      audio: evts.filter(e => e.channel === 'audio').length,
      alerts: evts.filter(e => e.kind === 'alert').length,
    }
  }, [session])

  const dateLabel = useMemo(() => {
    if (!session) return 'no session recorded'
    const isToday = selectedDate === isoDate(today)
    const d = new Date(selectedDate + 'T12:00:00')
    const label = isToday ? 'today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return `practice session · ${label} · ${session.duration} long`
  }, [session, selectedDate])

  return (
    <section>
      <div className="mb-[26px]">
        <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">Session timeline</h2>
        <p className="font-mono text-xs text-ink-3 mt-1">{dateLabel}</p>
      </div>

      {/* Day picker */}
      <div className="flex items-center gap-2 mb-[22px] flex-wrap">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(today, i - 6)
          const iso = isoDate(d)
          const hasSession = !!sessionEvents[iso]
          const isActive = iso === selectedDate
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              className={`font-sans flex flex-col items-center gap-0.5 py-2 px-3 pb-1.5 border rounded-[2px] cursor-pointer min-w-[52px] ${
                isActive
                  ? 'bg-ink border-ink'
                  : 'bg-transparent border-rule hover:border-ink-3'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${isActive ? 'text-paper opacity-70' : 'text-ink-3'}`}>
                {DOW[d.getDay()]}
              </span>
              <span className={`text-base font-medium leading-tight ${isActive ? 'text-paper' : 'text-ink'}`}>
                {d.getDate()}
              </span>
              <span
                className={`w-1 h-1 rounded-full mt-0.5 ${
                  isActive
                    ? hasSession ? 'bg-paper' : 'bg-transparent'
                    : hasSession ? 'bg-accent' : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
        <div className="w-px h-9 bg-rule mx-1" />
        <input
          type="date"
          value={selectedDate}
          max={isoDate(today)}
          onChange={e => { if (e.target.value) setSelectedDate(e.target.value) }}
          className="font-mono text-xs text-ink-2 bg-transparent border border-rule rounded-[2px] py-2 px-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex gap-6 flex-wrap font-mono text-xs text-ink-2 mb-[22px]">
          <span><strong className="text-ink font-medium">{summary.total}</strong> events</span>
          <span><strong className="text-ink font-medium">{summary.visual}</strong> visual</span>
          <span><strong className="text-ink font-medium">{summary.audio}</strong> audio</span>
          <span><strong className="text-ink font-medium">{summary.alerts}</strong> alerts</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-8 mb-6 flex-wrap">
        <FilterGroup label="Channel" options={[
          { key: 'all', label: 'All' },
          { key: 'visual', label: 'Visual · face & body' },
          { key: 'audio', label: 'Audio · speech' },
        ]} active={channelFilter} onChange={v => setChannelFilter(v as ChannelFilter)} />
        <FilterGroup label="Type" options={[
          { key: 'all', label: 'All' },
          { key: 'positive', label: 'Positive' },
          { key: 'alert', label: 'Alerts' },
          { key: 'note', label: 'Notes' },
        ]} active={kindFilter} onChange={v => setKindFilter(v as KindFilter)} />
      </div>

      {/* Event list */}
      <div className="border-t-[1.5px] border-rule-strong pt-[18px]">
        {!session ? (
          <div className="text-center py-10 text-ink-3 text-sm">
            <div>—</div>
            <div className="font-mono text-[11px] uppercase tracking-[0.06em] mt-2">No session recorded this day</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-10 text-ink-3 text-sm">
            <div className="font-mono text-[11px] uppercase tracking-[0.06em]">No events match filters</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredEvents.map((ev, i) => {
              const kindInfo = KIND_MAP[ev.kind]
              return (
                <div
                  key={`${ev.time}-${i}`}
                  className={`grid grid-cols-[46px_1fr_auto] gap-3 py-[13px] items-center ${
                    i < filteredEvents.length - 1 ? 'border-b border-rule' : ''
                  } ${i === 0 ? 'pt-0' : ''} ${i === filteredEvents.length - 1 ? 'pb-0' : ''}`}
                >
                  <span className="font-mono text-xs text-ink-3">{ev.time}</span>
                  <span className="text-[13px] leading-normal">{ev.desc}</span>
                  <span className="flex gap-1.5">
                    <span className="font-mono text-[10px] font-medium py-[3px] px-2 rounded-[2px] border border-rule text-ink-3 capitalize">
                      {ev.channel}
                    </span>
                    <span className={`font-mono text-[10px] font-medium py-[3px] px-2 rounded-[2px] ${kindInfo.cls}`}>
                      {kindInfo.label}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function FilterGroup({ label, options, active, onChange }: {
  label: string
  options: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 mr-0.5">{label}</span>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`font-sans text-xs font-medium py-[5px] px-3.5 rounded-[2px] cursor-pointer border ${
            active === opt.key
              ? 'bg-ink border-ink text-paper'
              : 'bg-transparent border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
          } focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
