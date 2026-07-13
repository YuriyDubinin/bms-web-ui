import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Tooltip } from '@shared/ui';
import { cn, useUIStore } from '@shared/lib';
import { BrandMark } from './BrandMark';
import { Navigation } from './Navigation';
import { UserBlock } from './UserBlock';

export type DesktopSidebarProps = {
  onLogoutClick: () => void;
  className?: string;
};

export function DesktopSidebar({ onLogoutClick, className }: DesktopSidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const toggleButton = (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
      aria-expanded={!collapsed}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-md border border-border-subtle bg-bg-2 text-fg-secondary',
        'transition-colors duration-150 ease-out hover:border-border-strong hover:text-fg-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        collapsed ? 'w-8 justify-center px-0' : 'w-full justify-start px-2.5',
      )}
    >
      {collapsed ? (
        <PanelLeftOpen size={16} aria-hidden />
      ) : (
        <>
          <PanelLeftClose size={16} aria-hidden />
          <span className="text-xs font-medium">Collapse</span>
        </>
      )}
    </button>
  );

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-border-subtle bg-bg-1 py-4 md:flex',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[60px] px-2' : 'w-[240px] px-4',
        className,
      )}
    >
      <div className={cn('flex h-6 items-center pb-3', collapsed ? 'justify-center' : '')}>
        {collapsed ? (
          <span className="font-mono text-sm font-bold tracking-tight text-fg-primary">D</span>
        ) : (
          <BrandMark />
        )}
      </div>
      <div className="border-t border-border-subtle" aria-hidden />
      <div className="mt-4">
        <Navigation layoutIdPrefix="desktop" collapsed={collapsed} />
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div className={cn('flex', collapsed ? 'justify-center' : '')}>
          {collapsed ? (
            <Tooltip content="Развернуть панель" side="right">
              {toggleButton}
            </Tooltip>
          ) : (
            toggleButton
          )}
        </div>
        <UserBlock onLogoutClick={onLogoutClick} collapsed={collapsed} />
      </div>
    </aside>
  );
}
