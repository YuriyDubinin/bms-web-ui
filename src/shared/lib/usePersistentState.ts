import { useEffect, useState } from 'react';

/**
 * Локальное состояние, переживающее перезагрузку через localStorage.
 *
 * Маленькая обёртка над `useState` для долгоживущих UX-предпочтений
 * (выбор «таблица / карточки», сортировка по умолчанию и т.п.).
 *
 * @param key       Ключ в localStorage. Чтобы избежать коллизий между разделами,
 *                  рекомендуется префиксовать: `'page.servers.view'`.
 * @param initial   Значение по умолчанию, если в storage пусто или мусор.
 * @param validate  Необязательная type-guard функция: если в storage оказалось
 *                  невалидное значение (например, после миграции типа),
 *                  откатываемся на `initial`.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (raw: unknown) => raw is T,
): [T, (next: T) => void] {
  const read = (): T => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      const parsed = JSON.parse(raw) as unknown;
      if (validate && !validate(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  };

  const [state, setState] = useState<T>(read);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // localStorage может быть недоступен (private mode / квота) — не критично,
      // просто работаем как обычный useState.
    }
  }, [key, state]);

  return [state, setState];
}
