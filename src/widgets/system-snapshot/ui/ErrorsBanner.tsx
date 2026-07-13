import { AlertTriangle } from 'lucide-react';
import type { SystemError } from '@entities/system';

export type ErrorsBannerProps = {
  errors: SystemError[];
};

/**
 * Ненавязчивый info-banner: какие секции метрик собрать не удалось в текущей среде.
 * Это норма для контейнеров (например, disks.io_counters требует /proc).
 */
export function ErrorsBanner({ errors }: ErrorsBannerProps) {
  if (errors.length === 0) return null;

  return (
    <section
      role="status"
      aria-label="Collection warnings"
      className="rounded-md border border-state-warning/30 bg-state-warning-muted px-4 py-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-state-warning" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-medium text-fg-primary">
            Some sections unavailable in this environment
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {errors.map((e, i) => (
              <li key={i} className="font-mono text-[11px] text-fg-secondary">
                <span className="text-fg-muted">{e.section}</span>
                <span className="text-fg-muted"> · </span>
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
