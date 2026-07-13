import { Spinner } from './Spinner';

export type FullScreenSpinnerProps = {
  label?: string;
};

/**
 * Полноэкранный spinner с лёгким fade. Используется как route-guard loading state
 * и как Suspense fallback для lazy-pages.
 */
export function FullScreenSpinner({ label = 'Loading' }: FullScreenSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0 animate-fade-in"
    >
      <Spinner size={20} label={label} />
      <span className="sr-only">{label}…</span>
    </div>
  );
}
