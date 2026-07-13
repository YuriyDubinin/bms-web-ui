import type { ReactNode } from 'react';
import { cn } from '../lib';

export type StatFieldProps = {
  label: string;
  /** Значение. Если ReactNode — рендерится как есть. */
  value: ReactNode;
  /** Моноширинный value (для id/токенов/чисел). */
  mono?: boolean;
  /** Сделать value крупным (24px), полезно для KPI. */
  emphasis?: boolean;
  /** Подпись справа от value (например, unit). */
  unit?: string;
  /** Цвет value (например state-error при критическом значении). */
  valueClassName?: string;
  className?: string;
};

/**
 * Универсальная label/value пара. По умолчанию label выше, value снизу;
 * label маленький uppercase tracked, value — sans или mono.
 */
export function StatField({
  label,
  value,
  mono = false,
  emphasis = false,
  unit,
  valueClassName,
  className,
}: StatFieldProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </span>
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className={cn(
            mono ? 'font-mono' : 'font-sans',
            emphasis ? 'text-2xl text-fg-primary' : 'text-sm text-fg-primary',
            valueClassName,
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}
