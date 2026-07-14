import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './nav';
import { NavGlyph } from './icons';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export type NavListProps = {
  /** Свёрнутый режим — только иконки по центру (десктопный сайдбар). */
  collapsed?: boolean;
  /** Колбэк после клика по пункту — например, закрыть мобильный drawer. */
  onNavigate?: () => void;
};

/** Список пунктов навигации. Переиспользуется в сайдбаре и в мобильном drawer. */
export function NavList({ collapsed = false, onNavigate }: NavListProps) {
  return (
    <nav aria-label="Основная навигация">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-accent-muted text-accent'
                    : 'text-fg-secondary hover:bg-bg-2 hover:text-fg-primary',
                )
              }
            >
              <NavGlyph name={item.icon} />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
