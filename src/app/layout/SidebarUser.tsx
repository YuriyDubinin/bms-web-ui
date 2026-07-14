import { useState } from 'react';
import type { SessionUser } from '@app/api';
import { LogOutIcon } from './icons';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}

export type SidebarUserProps = {
  user: SessionUser | null;
  onLogout: () => Promise<void>;
  /** Свёрнутый режим — только аватар + иконка выхода. */
  collapsed?: boolean;
};

/** Блок пользователя (аватар, имя, роль) + кнопка выхода. Общий для сайдбара и drawer. */
export function SidebarUser({ user, onLogout, collapsed = false }: SidebarUserProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    // При успехе сессия очистится и роутер уведёт на /login; сбрасываем флаг на случай ошибки.
    void onLogout().finally(() => setLoggingOut(false));
  };

  if (!user) return null;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-[11px] font-semibold text-accent"
          title={`${user.full_name} · ${user.role}`}
        >
          {initials(user.full_name)}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Выход"
          aria-label="Выход"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOutIcon />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
          {initials(user.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg-primary">{user.full_name}</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-wide text-fg-muted">
            {user.role}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className={cx(
          'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-xs font-medium text-fg-secondary',
          'transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <LogOutIcon />
        {loggingOut ? 'Выход…' : 'Выход'}
      </button>
    </div>
  );
}
