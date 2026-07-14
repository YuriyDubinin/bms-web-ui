import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { SessionUser } from '@app/api';
import type { ThemeId } from '@app/theme';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileDrawer } from './MobileDrawer';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const COLLAPSE_KEY = 'bms.sidebar';

function getStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

export type AppLayoutProps = {
  authenticated: boolean;
  theme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  user: SessionUser | null;
  onLogout: () => Promise<void>;
};

/**
 * Каркас приватной зоны: guard + сайдбар (десктоп) + мобильный хедер/drawer + Outlet.
 * Состояние свёрнутости сайдбара переживает перезагрузку (localStorage).
 */
export function AppLayout({ authenticated, theme, onThemeChange, user, onLogout }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => getStoredCollapsed());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // localStorage недоступен — состояние проживёт только в памяти
    }
  }, [collapsed]);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-0 text-fg-primary transition-colors duration-300">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        theme={theme}
        onThemeChange={onThemeChange}
        user={user}
        onLogout={onLogout}
      />

      <MobileHeader
        onOpenMenu={() => setDrawerOpen(true)}
        theme={theme}
        onThemeChange={onThemeChange}
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      {/* Контент. Отступ слева под сайдбар — только на md+. */}
      <div
        className={cx(
          'transition-[padding] duration-200 ease-out',
          collapsed ? 'md:pl-[68px]' : 'md:pl-[260px]',
        )}
      >
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
