import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sessionEvents, isoDate, addDays, type SessionEvent } from '../data/sessions'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { DatePicker } from './ui/date-picker'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = new Date()

type KindFilter = 'all' | 'positive' | 'alert' | 'note'
type ChannelFilter = 'all' | 'visual' | 'audio'

const KIND_MAP: Record<string, { label: string; variant: 'positive' | 'alert' | 'default' }> = {
  positive: { label: 'Highlight', variant: 'positive' },
  alert: { label: 'Friction', variant: 'alert' },
  note: { label: 'Observation', variant: 'default' },
}

export default function TimelineView() {
  const [selectedDate, setSelectedDate] = useState(isoDate(today))
  const [stripEndDate, setStripEndDate] = useState(isoDate(today))
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
      friction: evts.filter(e => e.kind === 'alert').length,
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
    <section className="pb-24">
      {/* Header */}
      <div className="mb-10">
        <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-2">
          Session timeline
        </h2>
        <p className="font-mono text-xs text-ink-3">{dateLabel}</p>
      </div>

      {/* Control Panel (Calendar & Filters) */}
      <div className="bg-white rounded-xl p-8 mb-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 w-full">
          {/* 7 Day Strip */}
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 -mb-1 w-full md:w-auto">
            {Array.from({ length: 7 }, (_, i) => {
              const stripEndObj = new Date(stripEndDate + 'T12:00:00')
              const d = addDays(stripEndObj, i - 6)
              const iso = isoDate(d)
              const hasSession = !!sessionEvents[iso]
              const isActive = iso === selectedDate
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={`font-sans flex flex-col items-center gap-1 py-2.5 px-3 pb-2 border rounded-xl cursor-pointer min-w-[56px] transition-all ${
                    isActive
                      ? 'bg-ink border-ink shadow-sm scale-105'
                      : 'bg-transparent border-rule hover:border-ink-3 hover:bg-[#FAFAFA]'
                  }`}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${isActive ? 'text-paper opacity-70' : 'text-ink-3'}`}>
                    {DOW[d.getDay()]}
                  </span>
                  <span className={`text-[17px] font-medium leading-tight ${isActive ? 'text-paper' : 'text-ink'}`}>
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
          </div>
          
          <div className="flex items-center shrink-0">
            <DatePicker
              value={selectedDate}
              max={isoDate(today)}
              onChange={(d) => {
                setSelectedDate(d)
                setStripEndDate(d)
              }}
            />
          </div>
        </div>
      </div>

      {/* Event list */}
      <div className="bg-white rounded-xl p-8 min-h-[400px]">
        {/* Header: Summary & Filters */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6 pb-6 border-b border-rule">
          {summary ? (
            <div className="flex gap-6 flex-wrap font-mono text-xs text-ink-2">
              <span><strong className="text-ink font-medium text-[13px]">{summary.total}</strong> events</span>
              <span><strong className="text-ink font-medium text-[13px]">{summary.visual}</strong> visual</span>
              <span><strong className="text-ink font-medium text-[13px]">{summary.audio}</strong> audio</span>
              <span><strong className="text-alert font-medium text-[13px]">{summary.friction}</strong> friction</span>
            </div>
          ) : <div />}

          <div className="flex gap-8 flex-wrap xl:justify-end">
            <FilterGroup label="Channel" options={[
              { key: 'all', label: 'All' },
              { key: 'visual', label: 'Visual' },
              { key: 'audio', label: 'Audio' },
            ]} active={channelFilter} onChange={v => setChannelFilter(v as ChannelFilter)} />
            <FilterGroup label="Type" options={[
              { key: 'all', label: 'All' },
              { key: 'positive', label: 'Highlights' },
              { key: 'alert', label: 'Friction' },
              { key: 'note', label: 'Observations' },
            ]} active={kindFilter} onChange={v => setKindFilter(v as KindFilter)} />
          </div>
        </div>
        {!session ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 text-ink-3">
            <div className="text-[24px] mb-2 font-light text-ink-3">—</div>
            <div className="font-mono text-[12px] uppercase tracking-[0.06em]">No session recorded this day</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 text-ink-3">
            <div className="font-mono text-[12px] uppercase tracking-[0.06em]">No events match filters</div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col">
              {filteredEvents.map((ev, i) => {
                const kindInfo = KIND_MAP[ev.kind]
                return (
                  <motion.div
                    key={`${ev.time}-${ev.desc}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: i * 0.03, ease: 'easeOut' }}
                    className={`grid grid-cols-[56px_1fr_auto] gap-6 py-5 items-center group transition-colors hover:bg-[#FAFAFA] -mx-4 px-4 rounded-xl ${
                      i < filteredEvents.length - 1 ? 'border-b border-rule' : ''
                    }`}
                  >
                    <span className="font-mono text-[13px] font-medium text-ink-3 group-hover:text-ink transition-colors">{ev.time}</span>
                    <span className="font-sans text-[15px] text-ink-2 leading-relaxed">{ev.desc}</span>
                    <span className="flex items-center gap-2 w-[180px] justify-end">
                      <Badge size="sm" className="bg-white border border-rule shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-ink capitalize px-2 py-0.5 rounded-[4px]">
                        {ev.channel}
                      </Badge>
                      <Badge size="sm" variant={kindInfo.variant} className={`shadow-[0_1px_2px_rgba(0,0,0,0.02)] border px-2 py-0.5 rounded-[4px] ${ev.kind === 'positive' ? 'border-positive/20' : ev.kind === 'alert' ? 'border-alert/20' : 'border-rule'}`}>
                        {kindInfo.label}
                      </Badge>
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 mr-2">{label}</span>
      {options.map(opt => (
        <Button
          key={opt.key}
          variant={active === opt.key ? 'primary' : 'default'}
          size="sm"
          className="rounded-full px-5"
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
