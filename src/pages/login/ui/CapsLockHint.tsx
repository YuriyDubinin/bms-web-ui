import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Слушает keydown/keyup на window и подсвечивает состояние Caps Lock.
 * Используем `getModifierState` — единственный способ узнать состояние CapsLock
 * вне нажатия самой клавиши.
 */
export function CapsLockHint() {
  const [active, setActive] = useState<boolean>(false);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      setActive(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', handle);
    window.addEventListener('keyup', handle);
    return () => {
      window.removeEventListener('keydown', handle);
      window.removeEventListener('keyup', handle);
    };
  }, []);

  return (
    <AnimatePresence initial={false}>
      {active ? (
        <motion.p
          key="capslock"
          role="status"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="mt-1.5 text-xs text-state-warning"
        >
          Caps Lock on
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
