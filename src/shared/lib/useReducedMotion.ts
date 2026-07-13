import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Wrapper над framer-motion useReducedMotion.
 * Возвращает `true`, если у пользователя включён prefers-reduced-motion: reduce.
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
