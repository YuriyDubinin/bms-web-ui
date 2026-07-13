import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib';
import { Label } from './Label';

export type InputProps = {
  label?: string;
  /** Сообщение об ошибке; включает error-state и aria-invalid. */
  error?: string;
  /** Подсказка под полем (показывается, если нет error). */
  helper?: string;
  /** Иконка слева внутри поля. */
  leftIcon?: ReactNode;
  /** Кнопка-глаз для type="password" (включить переключение видимости). */
  showToggle?: boolean;
  /** Изначально показывать пароль (text), а не маскировать. Работает с showToggle. */
  defaultRevealed?: boolean;
  required?: boolean;
  containerClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'children'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helper,
    leftIcon,
    showToggle,
    defaultRevealed = false,
    required,
    id,
    type = 'text',
    className,
    containerClassName,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [revealed, setRevealed] = useState(defaultRevealed);

  const isPassword = type === 'password';
  const effectiveType = isPassword && showToggle ? (revealed ? 'text' : 'password') : type;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label ? (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      ) : null}

      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(
            'w-full rounded-md border bg-bg-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted',
            'transition-colors duration-150 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon ? 'pl-9' : '',
            isPassword && showToggle ? 'pr-9' : '',
            error
              ? 'border-state-error focus:border-state-error focus:ring-state-error/30'
              : 'border-border-subtle focus:border-accent focus:ring-accent/30',
            className,
          )}
          {...rest}
        />
        {isPassword && showToggle ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {revealed ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" aria-live="polite" className="text-xs text-state-error">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-xs text-fg-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
});
