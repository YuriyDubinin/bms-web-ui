import { useEffect, useState } from 'react';

/** Порядок соответствует ходу времени суток — так и рендерится в переключателе. */
export const THEME_IDS = ['morning', 'day', 'evening', 'night'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'morning', label: 'Утро' },
  { id: 'day', label: 'День' },
  { id: 'evening', label: 'Вечер' },
  { id: 'night', label: 'Ночь' },
];

/** Тот же ключ и дефолт, что и в inline-скрипте index.html — держим синхронно. */
const STORAGE_KEY = 'bms.theme';
export const DEFAULT_THEME: ThemeId = 'night';

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // localStorage недоступен (private mode) — используем дефолт
  }
  return DEFAULT_THEME;
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute('data-theme', id);
}

/**
 * Единый источник правды по теме. Держите ОДИН инстанс на приложение (в корневом
 * компоненте) и прокидывайте value/setter вниз — иначе несколько useTheme разойдутся
 * по состоянию. Синхронизирует DOM-атрибут и localStorage при каждом изменении.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage недоступен — тема применится, но не переживёт перезагрузку
    }
  }, [theme]);

  return { theme, setTheme };
}
