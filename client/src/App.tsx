import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import LiveView from './components/LiveView';
import LandingPage from './components/LandingPage';
import ConsentView from './components/ConsentView';
import DebriefView from './components/DebriefView';
import StatsView from './components/StatsView';
import TimelineView from './components/TimelineView';
import { SessionProvider, useSession } from './session/SessionContext';

const pageVariants = {
  initial: { opacity: 0, y: 6 },
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
  const { phase, setPhase, endAndDebrief, kill } = useSession();
  const [modal, setModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <div className="relative max-w-[1160px] mx-auto px-7 pb-14">
      <Header
        phase={phase}
        onBrandClick={() => {
          if (phase === 'live') kill();
          else setPhase('home');
        }}
        onEndSession={() => void endAndDebrief()}
        onKill={kill}
        onPhaseChange={setPhase}
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
          {phase === 'home' && <LandingPage onEnterApp={() => setPhase('consent')} />}
          {phase === 'consent' && <ConsentView />}
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
            <p className="font-sans text-[14px] text-ink-2 mt-3 max-w-[30ch]">
              A consented social co-pilot for one-on-one conversations.
            </p>
          </div>
          <div className="text-left flex flex-col gap-3 items-start">
            <button onClick={() => setModal('privacy')} className="text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">Privacy FAQ</button>
            <button onClick={() => setModal('terms')} className="text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">Terms of Service</button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center text-[13px] text-ink-3">
          <p>© {new Date().getFullYear()} Wavelength. All rights reserved.</p>
          <p className="mt-4 md:mt-0">Analyzed locally. Never stored.</p>
        </div>
      </footer>

      {/* Simple Information Modal */}
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
                <button 
                  onClick={() => setModal(null)} 
                  className="px-6 py-2.5 bg-paper-2 hover:bg-rule text-ink rounded-full text-[14px] font-medium transition-colors"
                >
                  Close
                </button>
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
