import { motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

export type FadeInProps = {
  children: ReactNode;
  /** Задержка перед стартом, секунды. */
  delay?: number;
  /** Длительность, секунды. По умолчанию 0.2. */
  duration?: number;
  /** Сдвиг по Y в px для лёгкого slide-эффекта (4–8). 0 — чистый fade. */
  distance?: number;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition' | 'children'>;

/**
 * Fade + tiny slide на mount. MotionConfig в RootLayout сам обнулит длительности
 * при prefers-reduced-motion, отдельной проверки здесь не нужно.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.2,
  distance = 4,
  className,
  ...rest
}: FadeInProps) {
  const transition: Transition = { duration, delay, ease: 'easeOut' };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
