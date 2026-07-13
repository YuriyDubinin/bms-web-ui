import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib';

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
} as const;

const variantClasses = {
  ghost:
    'bg-transparent text-fg-secondary hover:bg-bg-2 hover:text-fg-primary border border-transparent',
  secondary:
    'bg-bg-2 text-fg-primary border border-border-subtle hover:bg-bg-3 hover:border-border-strong',
  // Акцентная заливка — для одного главного CTA на карточке/строке.
  primary: [
    'bg-accent text-accent-on border border-accent',
    'hover:bg-accent-hover hover:border-accent-hover',
    'active:bg-accent active:opacity-90',
  ].join(' '),
} as const;

export type IconButtonProps = {
  /** Обязателен для a11y — описывает действие. */
  'aria-label': string;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', variant = 'ghost', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'transition-[background-color,border-color,color] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'active:scale-[0.96]',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
