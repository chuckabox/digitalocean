export interface SessionEvent {
  time: string
  desc: string
  kind: 'positive' | 'alert' | 'note'
  channel: 'visual' | 'audio'
}

export interface Session {
  duration: string
  events: SessionEvent[]
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const today = new Date()

export const sessionEvents: Record<string, Session> = {
  [isoDate(today)]: {
    duration: '5:24',
    events: [
      { time: '5:12', desc: 'Warm closing, extended goodbye', kind: 'positive', channel: 'visual' },
      { time: '4:47', desc: 'Leaned in when you shared the story', kind: 'positive', channel: 'visual' },
      { time: '4:12', desc: 'Vocal pace slowing, volume drop', kind: 'note', channel: 'audio' },
      { time: '3:51', desc: 'Pace quickened, interrupted twice', kind: 'alert', channel: 'audio' },
      { time: '3:24', desc: 'Relaxed posture, open gestures', kind: 'positive', channel: 'visual' },
      { time: '2:58', desc: 'Re-engaged after your follow-up question', kind: 'positive', channel: 'visual' },
      { time: '2:26', desc: 'Disengagement signals detected', kind: 'alert', channel: 'visual' },
      { time: '2:10', desc: 'Vocal pitch dropped, shorter answers', kind: 'note', channel: 'audio' },
      { time: '1:41', desc: 'Attention drifting, repeated glances away', kind: 'alert', channel: 'visual' },
      { time: '1:02', desc: 'Nodding along, steady eye contact', kind: 'positive', channel: 'visual' },
      { time: '0:34', desc: 'Smiled at your opening question', kind: 'positive', channel: 'visual' },
      { time: '0:08', desc: 'Active listening, leaning in', kind: 'positive', channel: 'visual' },
    ],
  },
  [isoDate(addDays(today, -1))]: {
    duration: '4:15',
    events: [
      { time: '4:02', desc: 'Genuine smile at your closing remark', kind: 'positive', channel: 'visual' },
      { time: '3:18', desc: 'Volume dropped noticeably', kind: 'note', channel: 'audio' },
      { time: '2:44', desc: 'Crossed arms, leaned back', kind: 'alert', channel: 'visual' },
      { time: '1:50', desc: 'Steady nods, good eye contact', kind: 'positive', channel: 'visual' },
      { time: '0:55', desc: 'Open posture, engaged body language', kind: 'positive', channel: 'visual' },
      { time: '0:10', desc: 'Warm greeting received', kind: 'positive', channel: 'visual' },
    ],
  },
  [isoDate(addDays(today, -3))]: {
    duration: '6:02',
    events: [
      { time: '5:48', desc: 'Mutual laughter, strong rapport', kind: 'positive', channel: 'visual' },
      { time: '4:30', desc: 'Pace increased, slight tension in voice', kind: 'alert', channel: 'audio' },
      { time: '3:15', desc: 'Leaning in, mirroring your gestures', kind: 'positive', channel: 'visual' },
      { time: '2:00', desc: 'Brief glance away, then re-engaged', kind: 'note', channel: 'visual' },
      { time: '0:45', desc: 'Relaxed smile, open posture from start', kind: 'positive', channel: 'visual' },
    ],
  },
  [isoDate(addDays(today, -5))]: {
    duration: '3:48',
    events: [
      { time: '3:30', desc: 'Ended on a high note, warm goodbye', kind: 'positive', channel: 'visual' },
      { time: '2:20', desc: 'Monotone voice detected', kind: 'note', channel: 'audio' },
      { time: '1:10', desc: 'Fidgeting, repeated glances at phone', kind: 'alert', channel: 'visual' },
      { time: '0:15', desc: 'Polite but reserved opening', kind: 'note', channel: 'visual' },
    ],
  },
}

export const statsData = {
  all: {
    trend: [48, 52, 50, 57, 55, 61, 58, 63, 67, 64, 70, 72],
    emotions: { warmth: 78, trust: 71, interest: 64, ease: 58, tension: 34, confusion: 22 },
  },
  visual: {
    trend: [52, 55, 54, 60, 59, 64, 62, 67, 70, 68, 73, 75],
    emotions: { warmth: 81, trust: 74, interest: 69, ease: 61, tension: 30, confusion: 18 },
  },
  audio: {
    trend: [42, 47, 45, 52, 50, 56, 53, 58, 62, 59, 66, 68],
    emotions: { warmth: 72, trust: 66, interest: 55, ease: 52, tension: 41, confusion: 29 },
  },
} as const

export type StatsChannel = keyof typeof statsData
