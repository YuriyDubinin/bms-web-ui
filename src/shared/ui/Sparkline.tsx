import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib';

export type SparklineProps = {
  /** Текущее значение; копится во внутреннем буфере истории. */
  value: number | undefined;
  /** Ключ, по которому понимаем «есть новый сэмпл» — обычно ISO collected_at. */
  sampledAt?: string | number;
  /** Сколько последних точек держать (default 60). */
  capacity?: number;
  /** Фиксированный максимум для нормировки. Если не задан — auto-scale. */
  max?: number;
  /** Высота в px. Ширина растягивается на родителя. */
  height?: number;
  className?: string;
  /** Tailwind-класс акцентного цвета линии (по умолчанию text-accent). */
  strokeClassName?: string;
};

/**
 * Минималистичный inline-SVG sparkline. Историю держит у себя локально,
 * новый сэмпл пушится при изменении `sampledAt`. На reset (unmount) — теряется.
 */
export function Sparkline({
  value,
  sampledAt,
  capacity = 60,
  max,
  height = 32,
  className,
  strokeClassName = 'text-accent',
}: SparklineProps) {
  const [history, setHistory] = useState<number[]>(() =>
    typeof value === 'number' && Number.isFinite(value) ? [value] : [],
  );
  const lastKeyRef = useRef<string | number | undefined>(sampledAt);

  useEffect(() => {
    if (sampledAt !== undefined && sampledAt === lastKeyRef.current && history.length > 0) return;
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    lastKeyRef.current = sampledAt;
    setHistory((h) => {
      const next = h.length >= capacity ? h.slice(h.length - capacity + 1) : h.slice();
      next.push(value);
      return next;
    });
  }, [value, sampledAt, capacity, history.length]);

  const gradientId = useId();

  if (history.length === 0) {
    return <div aria-hidden style={{ height }} className={cn('w-full', className)} />;
  }

  const w = 100;
  const h = 100;
  const dataMax = max ?? Math.max(...history, 1);
  const effectiveMax = dataMax === 0 ? 1 : dataMax;
  const stepX = history.length > 1 ? w / (history.length - 1) : 0;

  const points = history
    .map((v, i) => `${(i * stepX).toFixed(2)},${(h - (Math.max(0, v) / effectiveMax) * h).toFixed(2)}`)
    .join(' ');

  const areaPoints =
    history.length > 1
      ? `0,${h} ${points} ${(w).toFixed(2)},${h}`
      : `0,${h} ${points} ${(stepX || w).toFixed(2)},${h}`;

  return (
    <svg
      role="img"
      aria-label="trend"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height }}
      className={cn('w-full', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className={strokeClassName}>
        <polyline
          points={areaPoints}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
