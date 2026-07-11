import { useState, useEffect } from 'react'
import Header from './components/Header'
import LiveView from './components/LiveView'
import StatsView from './components/StatsView'
import TimelineView from './components/TimelineView'

type View = 'live' | 'stats' | 'timeline'

export default function App() {
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.slice(1)
    return ['live', 'stats', 'timeline'].includes(hash) ? (hash as View) : 'live'
  })

  useEffect(() => {
    if (window.location.hash !== '#' + view) {
      history.replaceState(null, '', '#' + view)
    }
  }, [view])

  return (
    <div className="max-w-[1160px] mx-auto px-7 pb-14">
      <Header currentView={view} onViewChange={setView} />
      {view === 'live' && <LiveView onGoToTimeline={() => setView('timeline')} />}
      {view === 'stats' && <StatsView />}
      {view === 'timeline' && <TimelineView />}
    </div>
  )
}
