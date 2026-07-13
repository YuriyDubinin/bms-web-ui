import { cn } from '../lib';

export type UsageBarProps = {
  /** Процент 0..100. */
  percent: number;
  /** Порог жёлтого. По умолчанию 75. */
  warnThreshold?: number;
  /** Порог красного. По умолчанию 90. */
  criticalThreshold?: number;
  /** Тонкая или обычная — 2px / 6px высота. */
  size?: 'sm' | 'md';
  className?: string;
  /** Подписи слева/справа над баром. */
  leftLabel?: string;
  rightLabel?: string;
};

function colorFor(percent: number, warn: number, crit: number): string {
  if (percent >= crit) return 'bg-state-error';
  if (percent >= warn) return 'bg-state-warning';
  return 'bg-accent';
}

export function UsageBar({
  percent,
  warnThreshold = 75,
  criticalThreshold = 90,
  size = 'md',
  className,
  leftLabel,
  rightLabel,
}: UsageBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color = colorFor(clamped, warnThreshold, criticalThreshold);

  return (
    <div className={cn('w-full', className)}>
      {(leftLabel || rightLabel) && (
        <div className="mb-1 flex items-baseline justify-between text-[10px] font-mono uppercase tracking-wider text-fg-muted">
          <span className="truncate">{leftLabel ?? ''}</span>
          <span className="ml-2 shrink-0 normal-case tracking-normal">{rightLabel ?? ''}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('w-full overflow-hidden rounded-sm bg-bg-2', size === 'sm' ? 'h-1' : 'h-1.5')}
      >
        <div
          className={cn('h-full transition-[width,background-color] duration-300 ease-out', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
