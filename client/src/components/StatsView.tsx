import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import { statsData, type StatsChannel } from '../data/sessions'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

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

  const chartData = data.trend.map((value, i) => ({ session: i + 1, score: value }))
  const last = chartData[chartData.length - 1]

  return (
    <section className="pb-24">
      {/* Header */}
      <div className="mb-10">
        <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-2">
          How people experience you
        </h2>
        <p className="font-mono text-xs text-ink-3">across 12 practice sessions · last 30 days</p>
      </div>

      {/* Channel Filters */}
      <div className="flex gap-2 mb-8 flex-wrap" role="group" aria-label="Signal channel">
        {CHANNELS.map(({ key, label }) => (
          <Button
            key={key}
            variant={channel === key ? 'primary' : 'default'}
            size="sm"
            onClick={() => setChannel(key)}
            className="rounded-full px-5"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <StatTile label="Overall perception" value={<>{last.score}<span className="text-[18px] font-normal text-ink-3 ml-[4px]">/100</span></>} delta="+8 vs first 4 sessions" deltaType="up" />
        <StatTile label="Sessions analyzed" value="12" delta="last 30 days" deltaType="flat" />
        <StatTile label="Average engagement" value={<>64<span className="text-[18px] font-normal text-ink-3 ml-[4px]">%</span></>} delta="+5 vs last month" deltaType="up" />
        <StatTile label="Friction per session" value="2.1" delta="−0.8, improving" deltaType="up" />
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl p-8 mb-16">
        <div className="mb-8">
          <h3 className="font-sans text-[20px] font-medium text-ink mb-1">Perception score over sessions</h3>
          <p className="text-[14px] text-ink-3">12 sessions</p>
        </div>
        
        <motion.div
          key={channel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F4E87" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#2F4E87" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E3DFD4" strokeDasharray="" vertical={false} />
              <XAxis
                dataKey="session"
                tick={{ fontSize: 11, fill: '#A39D8E', fontFamily: 'IBM Plex Mono, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#E3DFD4' }}
                label={{ value: 'session', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#A39D8E', fontFamily: 'IBM Plex Mono, monospace' }}
              />
              <YAxis
                domain={[40, 80]}
                tick={{ fontSize: 11, fill: '#A39D8E', fontFamily: 'IBM Plex Mono, monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <RTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as typeof chartData[number]
                  return (
                    <div className="bg-paper border border-ink-3 rounded-[4px] py-1.5 px-3 font-mono text-[12px] text-ink shadow-sm">
                      session {d.session} — <strong className="font-medium text-accent">{d.score}</strong>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#2F4E87"
                strokeWidth={3}
                fill="url(#scoreGrad)"
                dot={false}
                activeDot={{ r: 6, fill: '#2F4E87', stroke: '#F7F5F0', strokeWidth: 2 }}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Asymmetrical Grid (Emotions + Focus) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
        
        {/* Emotions */}
        <div className="bg-white rounded-xl p-8">
          <div className="mb-8">
            <h3 className="font-sans text-[20px] font-medium text-ink mb-1">Emotions you evoke</h3>
            <p className="text-[14px] text-ink-3">avg across sessions</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 mb-1">People felt</div>
            {POSITIVE_EMOTIONS.map(key => (
              <EmotionRow key={key} label={key} value={data.emotions[key]} color="accent" />
            ))}
            
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 mt-6 mb-1">Watch areas</div>
            {WATCH_EMOTIONS.map(key => (
              <EmotionRow key={key} label={key} value={data.emotions[key]} color="warn" />
            ))}
          </div>
        </div>

        {/* Focus cards */}
        <div className="bg-white rounded-xl p-8 flex flex-col">
          <div className="mb-8">
            <h3 className="font-sans text-[20px] font-medium text-ink mb-1">What to focus on</h3>
            <p className="text-[14px] text-ink-3">from your last 12 sessions</p>
          </div>
          
          <div className="flex flex-col gap-4 flex-1">
            <FocusCard 
              type="work" 
              title="Give space before topic changes" 
              text="Tension rose right after quick topic switches in 4 of your 6 friction events. Try pausing two to three seconds before moving to something new." 
            />
            <FocusCard 
              type="work" 
              title="Re-engage around the 2-minute mark" 
              text="Interest dips most between minutes 2 and 3. In three sessions, a follow-up question at that point brought engagement back up." 
            />
            <FocusCard 
              type="strength" 
              title="Keep your warm openings" 
              text="Warmth peaks in your first minute of every session. Your openings work — carry that same energy into topic changes." 
            />
          </div>
        </div>

      </div>
    </section>
  )
}

function StatTile({ label, value, delta, deltaType }: {
  label: string
  value: React.ReactNode
  delta: string
  deltaType: 'up' | 'down' | 'flat'
}) {
  const deltaColor = { up: 'text-positive', down: 'text-alert', flat: 'text-ink-3' }[deltaType]
  return (
    <div className="bg-white rounded-xl p-6 md:p-8 flex flex-col transition-transform duration-300 hover:-translate-y-1">
      <div className="text-[12px] font-semibold uppercase tracking-[0.09em] text-ink-3 mb-4">{label}</div>
      <div className="font-sans text-[42px] md:text-[48px] tracking-tight font-light leading-none mb-4 text-ink">{value}</div>
      <div className={`font-mono text-[12px] mt-auto ${deltaColor}`}>{delta}</div>
    </div>
  )
}

function EmotionRow({ label, value, color }: { label: string; value: number; color: 'accent' | 'warn' }) {
  return (
    <div className="grid grid-cols-[88px_1fr_40px] items-center gap-4 group">
      <span className="font-sans text-[14px] text-ink-2 capitalize group-hover:text-ink transition-colors">{label}</span>
      <div className="h-3 bg-bar-track rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color === 'accent' ? 'bg-accent' : 'bg-warn'}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[13px] font-medium text-ink min-w-[36px] text-right">{value}</span>
    </div>
  )
}

function FocusCard({ type, title, text }: { type: 'work' | 'strength'; title: string; text: string }) {
  const isWork = type === 'work'
  return (
    <div className="rounded-xl p-6 transition-colors duration-300 bg-[#FAFAFA] hover:bg-[#F5F5F5]">
      <div className={`font-mono text-[11px] font-semibold uppercase tracking-[0.09em] mb-3 flex items-center gap-2 ${isWork ? 'text-alert' : 'text-positive'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {isWork ? 'Area to improve' : 'Core strength'}
      </div>
      <div className="font-sans text-[16px] font-semibold text-ink mb-2">{title}</div>
      <p className="font-sans text-[15px] text-ink-2 leading-relaxed">{text}</p>
    </div>
  )
}
