import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import LiveView from './components/LiveView';
import LandingPage from './components/LandingPage';
import ConsentView from './components/ConsentView';
import DebriefView from './components/DebriefView';
import { SessionProvider, useSession } from './session/SessionContext';

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function AppShell() {
  const { phase, setPhase, endAndDebrief, kill } = useSession();

  return (
    <div className="max-w-[1160px] mx-auto px-7 pb-14">
      <Header
        phase={phase}
        onBrandClick={() => {
          if (phase === 'live') kill();
          else setPhase('home');
        }}
        onEndSession={() => void endAndDebrief()}
        onKill={kill}
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
        </motion.div>
      </AnimatePresence>
      <footer className="mt-16 pt-8 border-t border-rule text-center">
        <div className="max-w-xl mx-auto">
          <h3 className="text-sm font-medium text-ink-2 mb-2">Privacy FAQ</h3>
          <p className="text-xs text-ink-3 leading-relaxed">
            Raw video and audio never leave this laptop. Only derived signal features and
            transcript text reach DigitalOcean. Session data is created only after both
            people consent.
          </p>
        </div>
      </footer>
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
