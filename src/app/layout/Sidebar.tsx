import type { SessionUser } from '@app/api';
import type { ThemePreference } from '@app/theme';
import { BrandMark } from './BrandMark';
import { NavList } from './NavList';
import { SidebarUser } from './SidebarUser';
import { ThemeControl } from './ThemeControl';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from './icons';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  theme: ThemePreference;
  onThemeChange: (id: ThemePreference) => void;
  user: SessionUser | null;
  onLogout: () => Promise<void>;
};

/** Десктопная боковая панель (md+). Сворачивается: иконки ⇄ иконки+текст. */
export function Sidebar({ collapsed, onToggle, theme, onThemeChange, user, onLogout }: SidebarProps) {
  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border-subtle bg-bg-1 md:flex',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[68px]' : 'w-[260px]',
      )}
    >
      {/* Шапка: бренд + кнопка сворачивания */}
      <div
        className={cx(
          'flex h-14 shrink-0 items-center border-b border-border-subtle px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed ? <BrandMark /> : null}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
        </button>
      </div>

      {/* Навигация */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <NavList collapsed={collapsed} />
      </div>

      {/* Тема */}
      <div className="shrink-0 border-t border-border-subtle px-3 py-3">
        <ThemeControl value={theme} onChange={onThemeChange} collapsed={collapsed} />
      </div>

      {/* Пользователь + выход */}
      <div className="shrink-0 border-t border-border-subtle px-3 py-3">
        <SidebarUser user={user} onLogout={onLogout} collapsed={collapsed} />
      </div>
    </aside>
  );
}
