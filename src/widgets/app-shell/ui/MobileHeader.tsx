import { forwardRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { LogOut, Menu } from 'lucide-react';
import { Button, IconButton } from '@shared/ui';
import { cn } from '@shared/lib';
import { useSessionStore } from '@entities/session';
import { BrandMark } from './BrandMark';

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export type MobileHeaderProps = {
  onMenuOpen: () => void;
  onLogoutClick: () => void;
  /** Внешняя ref на кнопку-гамбургер — чтобы вернуть на неё фокус после закрытия drawer'а. */
  menuButtonRef?: React.Ref<HTMLButtonElement>;
};

export const MobileHeader = forwardRef<HTMLElement, MobileHeaderProps>(function MobileHeader(
  { onMenuOpen, onLogoutClick, menuButtonRef },
  ref,
) {
  const employee = useSessionStore((s) => s.employee);

  return (
    <header
      ref={ref}
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-bg-1 px-4 md:hidden',
      )}
    >
      <IconButton
        ref={menuButtonRef}
        aria-label="Открыть меню"
        onClick={onMenuOpen}
      >
        <Menu size={16} aria-hidden />
      </IconButton>

      <BrandMark className="absolute left-1/2 -translate-x-1/2" />

      {employee ? (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`Account menu — ${employee.full_name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-bg-2 text-[11px] font-medium text-fg-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {initialsOf(employee.full_name) || '·'}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className="z-50 w-56 rounded-md border border-border-subtle bg-bg-3 p-3 data-[state=open]:animate-fade-in-up"
            >
              <p className="truncate text-sm text-fg-primary">{employee.full_name}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-fg-muted">{employee.email}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-start"
                leftIcon={<LogOut size={14} aria-hidden />}
                onClick={onLogoutClick}
              >
                Sign out
              </Button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <span aria-hidden className="h-8 w-8" />
      )}
    </header>
  );
});
