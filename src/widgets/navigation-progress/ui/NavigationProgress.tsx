import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '@shared/lib';

const PROGRESS_HOLD_MS = 250;

type Phase = 'idle' | 'starting' | 'finishing';

/**
 * Тонкая 1px-полоса акцентного цвета сверху страницы. На смену route'а:
 * 0 → 80% за 200ms, держится PROGRESS_HOLD_MS, → 100% + fade-out.
 * Реализовано на CSS-переходах поверх React state; respects reduced-motion.
 */
export function NavigationProgress() {
  const { pathname } = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (prefersReducedMotion) return;
    setPhase('starting');
    const finishId = window.setTimeout(() => setPhase('finishing'), PROGRESS_HOLD_MS);
    const resetId = window.setTimeout(() => setPhase('idle'), PROGRESS_HOLD_MS + 350);
    return () => {
      window.clearTimeout(finishId);
      window.clearTimeout(resetId);
    };
  }, [pathname, prefersReducedMotion]);

  if (prefersReducedMotion || phase === 'idle') return null;

  const width = phase === 'starting' ? '80%' : '100%';
  const opacity = phase === 'finishing' ? 0 : 1;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-px"
    >
      <div
        className="h-full bg-accent transition-[width,opacity] duration-200 ease-out"
        style={{ width, opacity }}
      />
    </div>
  );
}
