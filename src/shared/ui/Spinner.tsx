import { Loader2 } from 'lucide-react';
import { cn } from '../lib';

export type SpinnerProps = {
  size?: number;
  className?: string;
  label?: string;
};

export function Spinner({ size = 16, className, label = 'Загрузка' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      size={size}
      className={cn('animate-spin text-current', className)}
    />
  );
}
