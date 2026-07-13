import { cn } from '@shared/lib';

export type LiveIndicatorProps = {
  /** Идёт ли запрос прямо сейчас (TanStack `isFetching`). */
  fetching: boolean;
  /** ms — для подписи периода обновления. */
  intervalMs: number;
  className?: string;
};

/**
 * Маленький live-индикатор: цветная точка + текст "LIVE · 3s".
 * Точка пульсирует пока идёт fetch.
 */
export function LiveIndicator({ fetching, intervalMs, className }: LiveIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full bg-state-success',
          fetching ? 'animate-pulse-soft' : '',
        )}
      />
      <span>LIVE · {Math.round(intervalMs / 1000)}s</span>
    </div>
  );
}
