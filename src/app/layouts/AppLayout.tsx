import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_EXIT_REASON_KEY } from '@shared/api';
import { ConfirmDialog, FullScreenSpinner, PageTransition, notify } from '@shared/ui';
import { cn, useUIStore } from '@shared/lib';
import { sessionSelectors, useSessionStore } from '@entities/session';
import { DesktopSidebar, MobileDrawer, MobileHeader } from '@widgets/app-shell';
import { NavigationProgress } from '@widgets/navigation-progress';

/**
 * Главный layout приватного приложения. Route guard:
 *   idle/loading → FullScreenSpinner;
 *   unauthenticated → Navigate to /login (state.from — текущая локация);
 *   authenticated → desktop sidebar + mobile header + drawer + <Outlet/>.
 */
export function AppLayout() {
  const status = useSessionStore(sessionSelectors.status);
  const logout = useSessionStore((s) => s.logout);

  const drawerOpen = useUIStore((s) => s.mobileDrawerOpen);
  const openDrawer = useUIStore((s) => s.openMobileDrawer);
  const closeDrawer = useUIStore((s) => s.closeMobileDrawer);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  const location = useLocation();
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // При resize в md+ — drawer автоматически закрывается.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handle = () => {
      if (mql.matches) closeDrawer();
    };
    handle();
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, [closeDrawer]);

  // Возврат фокуса на гамбургер при закрытии drawer'а.
  const prevDrawerOpenRef = useRef(drawerOpen);
  useEffect(() => {
    if (prevDrawerOpenRef.current && !drawerOpen) {
      menuButtonRef.current?.focus();
    }
    prevDrawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  const handleLogoutClick = useCallback(() => {
    closeDrawer();
    setLogoutOpen(true);
  }, [closeDrawer]);

  const handleLogoutConfirm = useCallback(async () => {
    setSigningOut(true);
    try {
      // Явный выход — стираем exitReason, чтобы на /login не показался лишний тост.
      try {
        sessionStorage.removeItem(AUTH_EXIT_REASON_KEY);
      } catch {
        // ignore
      }
      await logout();
      notify.info('Signed out');
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }, [logout, navigate]);

  if (status === 'idle' || status === 'loading') {
    return <FullScreenSpinner label="Authenticating" />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-bg-0 text-fg-primary">
      <DesktopSidebar onLogoutClick={handleLogoutClick} />

      <MobileHeader
        menuButtonRef={menuButtonRef}
        onMenuOpen={openDrawer}
        onLogoutClick={handleLogoutClick}
      />

      <MobileDrawer
        open={drawerOpen}
        onOpenChange={(open) => (open ? openDrawer() : closeDrawer())}
        onLogoutClick={handleLogoutClick}
      />

      <NavigationProgress />

      <div
        className={cn(
          'transition-[padding] duration-200 ease-out',
          sidebarCollapsed ? 'md:pl-[60px]' : 'md:pl-[240px]',
        )}
      >
        <main className="px-4 py-4 md:px-6 md:py-6">
          <Suspense fallback={<FullScreenSpinner label="Loading" />}>
            {/* Ключ по верхнему сегменту пути: при смене под-таба внутри секции
                (например /core ↔ /core/cicd) страница не перемонтируется — таб-бар
                остаётся зафиксированным, перерисовывается только контент вкладки. */}
            <PageTransition routeKey={`/${location.pathname.split('/')[1] ?? ''}`}>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={(open) => {
          if (!signingOut) setLogoutOpen(open);
        }}
        title="Sign out?"
        description="Your session will be terminated."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
