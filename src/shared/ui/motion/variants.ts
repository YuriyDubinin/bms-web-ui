import type { Transition, Variants } from 'framer-motion';

/** Базовый transition: ease-out, 200ms — общий тайминг для всей системы. */
export const baseTransition: Transition = { duration: 0.2, ease: 'easeOut' };

export const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const fadeOnlyVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
};

/** Для StaggerList: общий контейнер. */
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

/** Для дочерних элементов StaggerList. */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeOut' } },
};
