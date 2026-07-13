import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageTransitionVariants } from './variants';

export type PageTransitionProps = {
  /** Ключ для AnimatePresence — обычно pathname. */
  routeKey: string;
  children: ReactNode;
  className?: string;
};

/**
 * Лёгкая смена страниц: fade 150ms + tiny slide. Используется внутри RootLayout
 * вокруг <Outlet />.
 */
export function PageTransition({ routeKey, children, className }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        className={className}
        variants={pageTransitionVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
