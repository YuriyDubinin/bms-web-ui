import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib';

export type CheckboxProps = {
  label: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Кастомный чекбокс в стиле проекта. Полностью CSS-driven через peer-checked —
 * совместим с RHF register (управляет input.checked напрямую).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn('inline-flex cursor-pointer select-none items-start gap-2.5', className)}
    >
      <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0">
        <input ref={ref} id={inputId} type="checkbox" className="peer sr-only" {...rest} />
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 inline-flex items-center justify-center rounded-sm border transition-colors duration-150',
            'border-border-strong bg-bg-1',
            'peer-checked:border-accent peer-checked:bg-accent',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-bg-0',
          )}
        />
        <Check
          size={11}
          strokeWidth={3}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto text-accent-on opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-fg-primary">{label}</span>
        {hint ? <span className="text-xs text-fg-muted">{hint}</span> : null}
      </span>
    </label>
  );
});
