import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { NudgeResponse } from 'shared';

type Props = {
  nudge: (NudgeResponse & { id: string }) | null;
  onDismiss: () => void;
};

export default function NudgeToast({ nudge, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {nudge && (
        <motion.aside
          key={nudge.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-[min(100%-2rem,24rem)] border border-rule bg-paper shadow-[0_8px_30px_rgba(38,36,31,0.12)] p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3">Nudge</p>
            <Badge variant="accent" size="sm">
              {nudge.confidence}
            </Badge>
          </div>
          <p className="text-[15px] leading-relaxed text-ink font-light mb-3">{nudge.text}</p>
          {nudge.evidence.length > 0 && (
            <ul className="flex flex-col gap-1 mb-3">
              {nudge.evidence.map((e) => (
                <li key={e} className="font-mono text-[11px] text-ink-3 leading-snug">
                  · {e}
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" onClick={onDismiss} className="px-0">
            Dismiss
          </Button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
