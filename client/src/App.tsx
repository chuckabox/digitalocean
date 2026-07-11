import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import LiveView from './components/LiveView'
import StatsView from './components/StatsView'
import TimelineView from './components/TimelineView'

type View = 'live' | 'stats' | 'timeline'

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

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
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {view === 'live' && <LiveView onGoToTimeline={() => setView('timeline')} />}
          {view === 'stats' && <StatsView />}
          {view === 'timeline' && <TimelineView />}
        </motion.div>
      </AnimatePresence>
      <footer className="mt-16 pt-8 border-t border-rule text-center">
        <div className="max-w-xl mx-auto">
          <h3 className="text-sm font-medium text-ink-2 mb-2">Privacy FAQ</h3>
          <p className="text-xs text-ink-3 leading-relaxed">
            We don't record or store your data. We only perform live real-time analysis on your device. 
            If you upload a clip, it gets analyzed locally in memory but is never saved or transmitted.
          </p>
        </div>
      </footer>
    </div>
  )
}
