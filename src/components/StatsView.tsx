import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import { statsData, type StatsChannel } from '../data/sessions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
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
    <section>
      <div className="mb-[26px]">
        <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">How people experience you</h2>
        <p className="font-mono text-xs text-ink-3 mt-1">across 12 practice sessions · last 30 days</p>
      </div>

      <div className="flex gap-2 mb-[30px] flex-wrap" role="group" aria-label="Signal channel">
        {CHANNELS.map(({ key, label }) => (
          <Button
            key={key}
            variant={channel === key ? 'primary' : 'default'}
            size="sm"
            onClick={() => setChannel(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-4 border-t-[1.5px] border-t-rule-strong border-b border-b-rule mb-[34px] max-[900px]:grid-cols-2">
        <StatTile label="Overall perception" value={<>{last.score}<span className="text-[15px] font-normal text-ink-3 ml-[3px]">/100</span></>} delta="+8 vs first 4 sessions" deltaType="up" first />
        <StatTile label="Sessions analyzed" value="12" delta="last 30 days" deltaType="flat" />
        <StatTile label="Average engagement" value={<>64<span className="text-[15px] font-normal text-ink-3 ml-[3px]">%</span></>} delta="+5 vs last month" deltaType="up" />
        <StatTile label="Alerts per session" value="2.1" delta="−0.8, improving" deltaType="up" />
      </div>

      <div className="grid grid-cols-2 gap-x-10 gap-y-[34px] max-[900px]:grid-cols-1">
        {/* Recharts trend */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Perception score over sessions</CardTitle>
            <CardDescription>12 sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              key={channel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <ResponsiveContainer width="100%" height={260}>
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
                        <div className="bg-paper border border-ink-3 rounded-[2px] py-[5px] px-2.5 font-mono text-[11px] text-ink shadow-sm">
                          session {d.session} — <strong className="font-medium">{d.score}</strong>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2F4E87"
                    strokeWidth={2}
                    fill="url(#scoreGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#2F4E87', stroke: '#F7F5F0', strokeWidth: 2 }}
                    animationDuration={600}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

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
          </CardContent>
        </Card>

        {/* Emotions */}
        <Card>
          <CardHeader>
            <CardTitle>Emotions you evoke</CardTitle>
            <CardDescription>avg across sessions</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Focus cards */}
        <Card>
          <CardHeader>
            <CardTitle>What to focus on</CardTitle>
            <CardDescription>from your last 12 sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3.5">
              <FocusCard type="work" title="Give space before topic changes" text="Tension rose right after quick topic switches in 4 of your 6 alerts. Try pausing two to three seconds before moving to something new." />
              <FocusCard type="work" title="Re-engage around the 2-minute mark" text="Interest dips most between minutes 2 and 3. In three sessions, a follow-up question at that point brought engagement back up." />
              <FocusCard type="strength" title="Keep your warm openings" text="Warmth peaks in your first minute of every session. Your openings work — carry that same energy into topic changes." />
            </div>
          </CardContent>
        </Card>
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
        <motion.div
          className={`h-full ${color === 'accent' ? 'bg-accent' : 'bg-warn'}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">{value}</span>
    </div>
  )
}

function FocusCard({ type, title, text }: { type: 'work' | 'strength'; title: string; text: string }) {
  return (
    <div className="relative bg-paper-2 rounded-[2px] py-3.5 px-4">
      <Badge
        variant={type === 'work' ? 'warn' : 'positive'}
        size="sm"
        className="absolute top-3.5 right-3.5 uppercase tracking-[0.05em]"
      >
        {type === 'work' ? 'Work on' : 'Strength'}
      </Badge>
      <div className="text-sm font-semibold mb-[5px] pr-[90px]">{title}</div>
      <p className="text-[13px] text-ink-2 leading-[1.65]">{text}</p>
    </div>
  )
}
