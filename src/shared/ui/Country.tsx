import type { ReactNode } from 'react';
import { cn } from '../lib';

export type CountryProps = {
  /** ISO 3166-1 alpha-2 (регистр любой). */
  code?: string | null;
  /** Английское имя страны (из API). */
  name?: string | null;
  /** Ширина флага в пикселях; высота считается как 4:3 (по умолчанию 18). */
  size?: number;
  /**
   * Что выводить рядом с флагом:
   *  - 'code' — только флаг (имя удобно класть в Tooltip снаружи);
   *  - 'name' — флаг + имя страны;
   *  - 'both' — флаг + имя + код в скобках (для подробных мест).
   */
  variant?: 'code' | 'name' | 'both';
  /** Что показать, если страны нет (пустой/невалидный code). */
  fallback?: ReactNode;
  className?: string;
};

const DEFAULT_FALLBACK = <span className="text-fg-muted">—</span>;

/**
 * Универсальный «страна»-индикатор: PNG-флаг с flagcdn.com + опциональное имя/код.
 * Контракт совпадает у GET /api/system/main (host.country_code/country) и у
 * GET /api/servers/list (items[].country_code/country) — поэтому один компонент
 * подходит и под верхнюю панель Core, и под список серверов.
 */
export function Country({
  code,
  name,
  size = 18,
  variant = 'name',
  fallback = DEFAULT_FALLBACK,
  className,
}: CountryProps) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return <>{fallback}</>;

  const upper = code.toUpperCase();
  const cc = code.toLowerCase();
  const h = Math.round(size * 0.75);
  const h2 = Math.round(size * 1.5);
  const label = name ?? upper;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src={`https://flagcdn.com/${size}x${h}/${cc}.png`}
        srcSet={`https://flagcdn.com/${size * 2}x${h2}/${cc}.png 2x`}
        alt={label}
        width={size}
        height={h}
        loading="lazy"
        className="rounded-sm border border-border-subtle/60"
      />
      {variant !== 'code' ? (
        <span className="text-xs text-fg-primary">{label}</span>
      ) : null}
      {variant === 'both' && name ? (
        <span className="font-mono text-[10px] text-fg-muted">({upper})</span>
      ) : null}
    </span>
  );
}
