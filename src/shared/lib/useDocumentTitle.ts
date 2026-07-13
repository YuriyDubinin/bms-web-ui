import { useEffect } from 'react';

const TITLE_PREFIX = 'BMS // CONSOLE';

/**
 * Устанавливает document.title как `BMS // CONSOLE — {section}`.
 * Передайте `null` чтобы оставить только префикс.
 */
export function useDocumentTitle(section: string | null): void {
  useEffect(() => {
    const previous = document.title;
    document.title = section ? `${TITLE_PREFIX} — ${section}` : TITLE_PREFIX;
    return () => {
      document.title = previous;
    };
  }, [section]);
}
