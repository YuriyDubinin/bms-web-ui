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

/**
 * «Авто» — не отдельная тема, а режим: применяемая тема подбирается по времени суток.
 * Предпочтение (что выбрал пользователь) отделено от реально применяемой темы.
 */
export type ThemePreference = ThemeId | 'auto';

/** Пункты переключателя: четыре темы по ходу суток + режим «Авто» последним. */
export const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  ...THEMES,
  { id: 'auto', label: 'Авто' },
];

/** Тот же ключ и дефолт, что и в inline-скрипте index.html — держим синхронно. */
const STORAGE_KEY = 'bms.theme';
export const DEFAULT_THEME: ThemeId = 'night';

/**
 * Тема для авто-режима по часу суток. Границы (5/11/17/22) держим В СИНХРОНЕ с
 * inline-скриптом в index.html — там та же логика на чистом JS до загрузки React.
 * Утро 05–10, День 11–16, Вечер 17–21, Ночь 22–04.
 */
export function themeForHour(hour: number): ThemeId {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** Тема, соответствующая текущему (или переданному) моменту времени. */
export function resolveAutoTheme(now: Date = new Date()): ThemeId {
  return themeForHour(now.getHours());
}

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

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'auto' || isThemeId(value);
}

/** Сохранённое предпочтение (тема или 'auto'); дефолт — если ничего валидного нет. */
export function getStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
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
 *
 * `theme` — это ПРЕДПОЧТЕНИЕ (тема или 'auto'); оно и сохраняется. Реально применяемая
 * тема в авто-режиме вычисляется по времени суток и обновляется, пока режим включён.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(() => getStoredPreference());
  // Тема по времени — задействуется только в авто-режиме.
  const [autoTheme, setAutoTheme] = useState<ThemeId>(() => resolveAutoTheme());

  // Что реально применяем к DOM: в авто-режиме — тема по времени, иначе — сам выбор.
  const effective: ThemeId = theme === 'auto' ? autoTheme : theme;

  useEffect(() => {
    applyTheme(effective);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage недоступен — тема применится, но не переживёт перезагрузку
    }
  }, [effective, theme]);

  // Пока включён авто-режим — раз в минуту пересчитываем тему по времени, чтобы она
  // сама менялась при переходе через границу суток (утро → день → вечер → ночь).
  useEffect(() => {
    if (theme !== 'auto') return;
    setAutoTheme(resolveAutoTheme());
    const timer = setInterval(() => setAutoTheme(resolveAutoTheme()), 60_000);
    return () => clearInterval(timer);
  }, [theme]);

  return { theme, setTheme };
}
