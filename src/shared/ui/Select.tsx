import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib';
import { Label } from './Label';

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  options: SelectOption[];
  /** Плейсхолдер-опция (disabled), показывается если значение пустое. */
  placeholder?: string;
  containerClassName?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helper, required, options, placeholder, id, className, containerClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label ? (
        <Label htmlFor={selectId} required={required}>
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(
            'w-full appearance-none rounded-md border bg-bg-1 px-3 py-2 pr-9 text-sm text-fg-primary',
            'transition-colors duration-150 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-state-error focus:border-state-error focus:ring-state-error/30'
              : 'border-border-subtle focus:border-accent focus:ring-accent/30',
            className,
          )}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted"
        />
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
