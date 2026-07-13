import type { ReactNode } from 'react';
import { cn } from '../lib';

export type KbdProps = {
  className?: string;
  children: ReactNode;
};

export function Kbd({ className, children }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm',
        'border border-border-subtle bg-bg-2 px-1.5 font-mono text-[11px] leading-none text-fg-secondary',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
