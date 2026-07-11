import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import LiveView from './components/LiveView'
import StatsView from './components/StatsView'
import TimelineView from './components/TimelineView'
import LandingPage from './components/LandingPage'

type View = 'home' | 'live' | 'stats' | 'timeline'

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export default function App() {
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1) as View
      if (['home', 'live', 'stats', 'timeline'].includes(hash)) {
        setView(hash)
      } else {
        setView('home')
      }
    }

    window.addEventListener('popstate', handlePopState)
    handlePopState()

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (view !== 'home') {
      window.history.pushState(null, '', `#${view}`)
    } else {
      window.history.pushState(null, '', window.location.pathname)
    }
  }, [view])

  return (
    <div className="relative max-w-[1160px] mx-auto px-7 pb-14">
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
          {view === 'home' && <LandingPage onEnterApp={() => setView('live')} />}
          {view === 'live' && <LiveView onGoToTimeline={() => setView('timeline')} />}
          {view === 'stats' && <StatsView />}
          {view === 'timeline' && <TimelineView />}
        </motion.div>
      </AnimatePresence>
      <footer className="mt-12 pt-12 pb-8 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12 items-start mb-8">
          <div className="text-left">
            <span className="font-sans font-medium tracking-tight text-xl text-ink">wavelength</span>
            <p className="font-sans text-[14px] text-ink-2 mt-3 max-w-[30ch]">
              A consented social co-pilot for one-on-one conversations.
            </p>
          </div>
          <div className="text-left flex flex-col gap-3">
            <a href="#" className="text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">Privacy FAQ</a>
            <a href="#" className="text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">Terms of Service</a>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center text-[13px] text-ink-3">
          <p>© {new Date().getFullYear()} Wavelength. All rights reserved.</p>
          <p className="mt-4 md:mt-0">Analyzed locally. Never stored.</p>
        </div>
      </footer>
    </div>
  )
}
