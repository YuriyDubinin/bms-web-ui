import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib';

export type LabelProps = {
  required?: boolean;
  children: ReactNode;
} & LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ required, children, className, ...rest }: LabelProps) {
  return (
    <label className={cn('text-xs font-medium text-fg-secondary', className)} {...rest}>
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-state-error">
          *
        </span>
      ) : null}
    </label>
  );
}
