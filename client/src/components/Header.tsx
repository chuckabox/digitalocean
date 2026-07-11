import type { AppPhase } from '@/session/SessionContext';

interface HeaderProps {
  phase: AppPhase;
  onBrandClick: () => void;
  onPhaseChange?: (phase: AppPhase) => void;
}

const VIEWS: { key: AppPhase; label: string }[] = [
  { key: 'stats', label: 'Stats' },
  { key: 'timeline', label: 'Timeline' },
];

export default function Header({ phase, onBrandClick, onPhaseChange }: HeaderProps) {
  return (
    <>
      <header className="flex items-baseline justify-between gap-4 pt-[26px]">
        <button
          type="button"
          onClick={onBrandClick}
          className="text-[21px] font-medium tracking-tight text-ink after:content-['.'] after:text-accent after:font-semibold bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          wavelength
        </button>

        <div className="flex items-center gap-6">
          {onPhaseChange && (
            <nav className="flex items-center gap-[26px]" aria-label="Main">
              <button
                onClick={() => onPhaseChange('live')}
                className={`font-sans text-[13px] tracking-[0.02em] pb-2 pt-0.5 border-none bg-transparent cursor-pointer transition-colors ${
                  phase === 'live' || phase === 'debrief'
                    ? 'text-ink font-semibold shadow-[inset_0_-2px_0_0_var(--color-accent)]'
                    : 'text-ink-2 font-normal hover:text-ink'
                } focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
              >
                Live
              </button>
              {VIEWS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onPhaseChange(key)}
                  className={`font-sans text-[13px] tracking-[0.02em] pb-2 pt-0.5 border-none bg-transparent cursor-pointer transition-colors ${
                    phase === key
                      ? 'text-ink font-semibold shadow-[inset_0_-2px_0_0_var(--color-accent)]'
                      : 'text-ink-2 font-normal hover:text-ink'
                  } focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">

          </div>
        </div>
      </header>

      <div className="h-6 mb-[30px]" aria-hidden="true">
        <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="block w-full h-full">
          <path
            d="M0,12 C40,12 40,5 80,5 S120,19 160,19 S200,7 240,7 S280,17 320,17 S360,6 400,6 S440,18 480,18 S520,8 560,8 S600,16 640,16 S680,5 720,5 S760,19 800,19 S840,7 880,7 S920,17 960,17 S1000,9 1040,9 S1080,15 1120,15 S1160,12 1200,12"
            fill="none"
            stroke="#2F4E87"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{
              strokeDasharray: 2600,
              strokeDashoffset: 2600,
              animation: 'wave-draw 1.5s ease-out 0.15s forwards',
            }}
          />
        </svg>
      </div>
    </>
  );
}
