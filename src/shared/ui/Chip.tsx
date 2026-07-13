import type { ReactNode } from 'react';
import { cn } from '../lib';

const toneClasses = {
  neutral: 'bg-bg-2 text-fg-secondary border-border-subtle',
  accent: 'bg-accent-muted text-accent border-transparent',
  success: 'bg-state-success-muted text-state-success border-transparent',
  error: 'bg-state-error-muted text-state-error border-transparent',
  warning: 'bg-state-warning-muted text-state-warning border-transparent',
  info: 'bg-state-info-muted text-state-info border-transparent',
} as const;

export type ChipTone = keyof typeof toneClasses;

export type ChipProps = {
  tone?: ChipTone;
  /** Моноширинный вариант — для id, токенов, кодов статуса. */
  mono?: boolean;
  className?: string;
  children: ReactNode;
};

export function Chip({ tone = 'neutral', mono = false, className, children }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs font-medium',
        mono ? 'font-mono tracking-tight' : '',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
