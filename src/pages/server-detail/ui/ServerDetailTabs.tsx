import { Gauge, Infinity as InfinityIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@shared/lib';

export type ServerDetailTab = 'main' | 'cicd';

const TABS: { id: ServerDetailTab; label: string; icon: LucideIcon }[] = [
  { id: 'main', label: 'Main', icon: Gauge },
  { id: 'cicd', label: 'CI / CD', icon: InfinityIcon },
];

export type ServerDetailTabsProps = {
  active: ServerDetailTab;
  onChange: (tab: ServerDetailTab) => void;
};

/**
 * Табы внутри страницы конкретного сервера. Визуально и поведенчески идентичны
 * CoreTabs — те же подчёркивание, иконки слева, accent-индикатор активного таба.
 */
export function ServerDetailTabs({ active, onChange }: ServerDetailTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Server sections"
      className="flex items-center gap-1 border-b border-border-subtle"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-t-md px-3 py-2.5 text-sm',
              'transition-colors duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive ? 'text-fg-primary' : 'text-fg-secondary hover:text-fg-primary',
            )}
          >
            <Icon
              size={15}
              aria-hidden
              className={cn(isActive ? 'text-accent' : 'text-current')}
            />
            <span>{tab.label}</span>
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-0 -bottom-px h-0.5 rounded-sm bg-accent transition-opacity duration-150 ease-out',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
