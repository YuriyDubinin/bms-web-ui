import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib';
import { Label } from './Label';

export type TextareaProps = {
  label?: string;
  /** Сообщение об ошибке; включает error-state и aria-invalid. */
  error?: string;
  /** Подсказка под полем (показывается, если нет error). */
  helper?: string;
  required?: boolean;
  containerClassName?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helper, required, id, rows = 4, className, containerClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label ? (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      ) : null}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        className={cn(
          'w-full resize-y rounded-md border bg-bg-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted',
          'transition-colors duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-state-error focus:border-state-error focus:ring-state-error/30'
            : 'border-border-subtle focus:border-accent focus:ring-accent/30',
          className,
        )}
        {...rest}
      />
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
