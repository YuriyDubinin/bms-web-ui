import type { ReactNode } from 'react';
import { cn } from '@shared/lib';

export type PageHeaderProps = {
  title: string;
  /** Моноширинный подзаголовок справа/снизу — например, "// empty". */
  subtitle?: string;
  /** Опциональный slot справа — кнопки, фильтры. */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-3 pb-6', className)}>
      <div>
        <h1 className="text-xl font-normal tracking-tight text-fg-primary">{title}</h1>
        {subtitle ? (
          <p className="mt-1 font-mono text-xs text-fg-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
