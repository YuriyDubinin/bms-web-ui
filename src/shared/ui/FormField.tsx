import type { ReactNode } from 'react';
import { cn } from '../lib';
import { Label } from './Label';

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  helper?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Обёртка label + control + error/helper для произвольного контрола.
 * Не клонирует ребёнка — id и aria-* связи прокидывает разработчик через `htmlFor` + id на контроле.
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  helper,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const helperId = `${htmlFor}-helper`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
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
}
