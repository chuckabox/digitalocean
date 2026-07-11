import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import LiveView from './components/LiveView';
import DebriefView from './components/DebriefView';
import StatsView from './components/StatsView';
import TimelineView from './components/TimelineView';
import { SessionProvider, useSession } from './session/SessionContext';
import { Button } from './components/ui/button';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const MODAL_CONTENT = {
  privacy: {
    title: 'Privacy FAQ',
    content: 'Wavelength operates strictly on-device. Your camera feed and audio never leave your laptop. Only derived, anonymized signals (like "tension level") and a transcript are processed by the AI backend to generate insights. No video or audio recordings are stored anywhere.'
  },
  terms: {
    title: 'Terms of Service',
    content: 'Wavelength is an exploratory tool for personal insight, not medical diagnosis or lie detection. By using Wavelength, you explicitly agree to obtain active two-party consent before utilizing the platform in any live conversations.'
  }
};

function AppShell() {
  const { phase, setPhase, endAndDebrief, kill, startSession, starting, startError } = useSession();
  const [modal, setModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <div className="relative max-w-[1160px] mx-auto px-7 pb-14">
      <Header
        phase={phase}
        onBrandClick={() => {
          if (phase === 'live') kill();
          else setPhase('home');
        }}
        onPhaseChange={(newPhase) => {
          if (newPhase === 'live') {
            void startSession();
          } else {
            setPhase(newPhase);
          }
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {phase === 'home' && (
            starting ? (
              <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <p className="text-ink-3 font-mono text-sm tracking-widest uppercase text-center max-w-md">
                  Starting camera...
                </p>
              </div>
            ) : startError ? (
              <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <p className="text-ink-3 font-mono text-sm tracking-widest uppercase text-center max-w-md">
                  Error: {startError}
                </p>
                <Button
                  variant="primary"
                  className="mt-4 rounded-full"
                  onClick={() => void startSession()}
                >
                  Retry Connection
                </Button>
              </div>
            ) : (
              <LandingPage onEnterApp={() => void startSession()} />
            )
          )}
          {phase === 'live' && (
            <LiveView onGoToTimeline={() => void endAndDebrief()} />
          )}
          {phase === 'debrief' && <DebriefView />}
          {phase === 'timeline' && <TimelineView />}
          {phase === 'stats' && <StatsView />}
        </motion.div>
      </AnimatePresence>

      <footer className="mt-12 pt-12 pb-8 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12 items-start mb-8">
          <div className="text-left">
            <span className="font-sans font-medium tracking-tight text-xl text-ink">wavelength</span>
            <p className="font-sans text-[14px] text-ink-2 mt-3 max-w-[34ch]">
              A consented co-pilot for people who struggle to read how others are feeling — built first for neurodivergent people.
            </p>
          </div>
          <div className="text-left flex flex-col gap-3 items-start">
            <Button variant="link" size="sm" onClick={() => setModal('privacy')}>Privacy FAQ</Button>
            <Button variant="link" size="sm" onClick={() => setModal('terms')}>Terms of Service</Button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center text-[13px] text-ink-3">
          <p>&copy; {new Date().getFullYear()} Wavelength. All rights reserved.</p>
        </div>
      </footer>

      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
              onClick={() => setModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-rule w-full max-w-md p-8 z-10"
            >
              <h3 className="font-sans text-[20px] font-medium text-ink mb-4">{MODAL_CONTENT[modal].title}</h3>
              <p className="font-sans text-[15px] text-ink-2 leading-relaxed">{MODAL_CONTENT[modal].content}</p>
              <div className="mt-8 flex justify-end">
                <Button
                  variant="default"
                  className="rounded-full"
                  onClick={() => setModal(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}
