import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn, useReducedMotion, useUIStore } from '@shared/lib';

const LETTERS = ['B', 'M', 'S'] as const;
const LETTER_STEP = 0.05;

export type BrandMarkProps = {
  className?: string;
};

/**
 * "BMS // CONSOLE". При первом монтировании за сессию буквы BMS печатаются
 * stagger-fade'ом, затем " // CONSOLE" появляется единым блоком. Флаг хранится
 * в UI-store (без persist), поэтому на reload анимация играется снова.
 */
export function BrandMark({ className }: BrandMarkProps) {
  const typedOnce = useUIStore((s) => s.brandTypedOnce);
  const markTyped = useUIStore((s) => s.markBrandTyped);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!typedOnce) markTyped();
    // Помечаем один раз; повторное срабатывание не страшно — action идемпотентен.
  }, [typedOnce, markTyped]);

  const baseCls = cn(
    'font-mono text-xs uppercase tracking-[0.2em] text-fg-primary select-none',
    className,
  );

  if (typedOnce || prefersReducedMotion) {
    return (
      <span className={baseCls}>
        BMS <span className="text-fg-muted">{'//'} CONSOLE</span>
      </span>
    );
  }

  return (
    <span className={baseCls} aria-label="BMS // CONSOLE">
      <span aria-hidden>
        {LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, delay: i * LETTER_STEP, ease: 'easeOut' }}
            className="inline-block"
          >
            {ch}
          </motion.span>
        ))}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.18,
            delay: LETTERS.length * LETTER_STEP + 0.05,
            ease: 'easeOut',
          }}
          className="text-fg-muted"
        >
          {' '}
          {'//'} CONSOLE
        </motion.span>
      </span>
    </span>
  );
}
