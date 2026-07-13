import type { ReactNode } from 'react';
import { cn } from '@shared/lib';

export type PanelTitleProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

/** Заголовок панели внутри Card. Меньше, чем глобальный PageHeader, но в той же стилистике. */
export function PanelTitle({ title, subtitle, actions, className }: PanelTitleProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-2 pb-3', className)}>
      <div>
        <h2 className="text-sm font-semibold text-fg-primary">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
