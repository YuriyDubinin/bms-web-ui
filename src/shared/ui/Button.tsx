import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib';
import { Spinner } from './Spinner';

const variantClasses = {
  primary: [
    'bg-accent text-accent-on border border-accent',
    'hover:bg-accent-hover hover:border-accent-hover',
    'active:bg-accent active:opacity-90',
  ].join(' '),
  secondary: [
    'bg-bg-2 text-fg-primary border border-border-subtle',
    'hover:bg-bg-3 hover:border-border-strong',
    'active:bg-bg-2',
  ].join(' '),
  ghost: [
    'bg-transparent text-fg-secondary border border-transparent',
    'hover:bg-bg-2 hover:text-fg-primary',
    'active:bg-bg-1',
  ].join(' '),
  destructive: [
    'bg-transparent text-state-error border border-border-subtle',
    'hover:bg-state-error-muted hover:border-state-error',
    'active:opacity-90',
  ].join(' '),
} as const;

type Variant = keyof typeof variantClasses;

const sizeClasses = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
} as const;

type Size = keyof typeof sizeClasses;

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Левая иконка; скрывается при loading. */
  leftIcon?: ReactNode;
  /** Правая иконка; скрывается при loading. */
  rightIcon?: ReactNode;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium select-none',
        'transition-[background-color,border-color,color,opacity] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 14} /> : leftIcon}
      {children ? <span className={cn(loading && 'opacity-0')}>{children}</span> : null}
      {!loading && rightIcon ? rightIcon : null}
    </button>
  );
});
