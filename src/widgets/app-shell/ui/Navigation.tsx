import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tooltip } from '@shared/ui';
import { cn } from '@shared/lib';
import { NAV_ITEMS, type NavItem } from '../model/nav';

export type NavigationProps = {
  /** Колбэк после клика по пункту — например, чтобы закрыть mobile drawer. */
  onItemSelect?: () => void;
  /** Уникальный для каждого инстанса (desktop / drawer) layoutId-prefix,
   *  чтобы две одновременно смонтированные навигации не «перетекали» друг к другу. */
  layoutIdPrefix?: string;
  /** Свёрнутый режим — только иконки по центру + tooltip с названием. */
  collapsed?: boolean;
  className?: string;
};

function Item({
  item,
  onSelect,
  layoutIdPrefix,
  collapsed,
}: {
  item: NavItem;
  onSelect?: () => void;
  layoutIdPrefix: string;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  // Свёрнутый режим: центрированный квадрат-иконка. Активный — accent-подложка,
  // без layoutId-полоски (она при сжатии давала артефакт растягивания на всю панель).
  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        <NavLink
          to={item.to}
          onClick={onSelect}
          aria-label={item.label}
          className="group flex w-full items-center justify-center rounded-md py-1 focus:outline-none"
        >
          {({ isActive }) => (
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 ease-out',
                'group-focus-visible:ring-2 group-focus-visible:ring-accent',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-fg-secondary group-hover:bg-bg-2 group-hover:text-fg-primary',
              )}
            >
              <Icon size={16} aria-hidden />
            </span>
          )}
        </NavLink>
      </Tooltip>
    );
  }

  // Развёрнутый режим: иконка + label, активный — bg + перетекающая accent-полоска слева.
  return (
    <NavLink
      to={item.to}
      onClick={onSelect}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isActive ? 'bg-bg-2 text-fg-primary' : 'text-fg-secondary hover:bg-bg-2 hover:text-fg-primary',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId={`${layoutIdPrefix}-nav-active`}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              aria-hidden
              className="absolute inset-y-1 left-0 w-0.5 rounded-sm bg-accent"
            />
          ) : null}
          <Icon size={16} aria-hidden className={cn(isActive ? 'text-accent' : 'text-current')} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Navigation({
  onItemSelect,
  layoutIdPrefix = 'nav',
  collapsed = false,
  className,
}: NavigationProps) {
  return (
    <nav
      role="navigation"
      aria-label="Основная навигация"
      className={cn('flex flex-col gap-1', className)}
    >
      {NAV_ITEMS.map((item) => (
        <Item
          key={item.to}
          item={item}
          onSelect={onItemSelect}
          layoutIdPrefix={layoutIdPrefix}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}
