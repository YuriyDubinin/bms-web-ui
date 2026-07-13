import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AUTH_EXIT_REASON_KEY } from '@shared/api';
import { FadeIn, notify } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { sessionSelectors, useSessionStore, type SessionFlag } from '@entities/session';
import { LoginForm } from './LoginForm';
import { UtcClock } from './UtcClock';

const APP_VERSION = 'v0.1.0';
const DEFAULT_REDIRECT = '/core';

type LocationState = { from?: { pathname: string } } | null;

const FLAG_TOASTS: Record<SessionFlag['reason'], { title: string; description?: string }> = {
  expired: { title: 'Session expired', description: 'Sign in again to continue.' },
  revoked: { title: 'Session revoked', description: 'Sign in again to continue.' },
  disabled: { title: 'Account disabled', description: 'Contact your administrator.' },
  unauthorized: { title: 'Sign in required' },
};

/** Маппинг кодов backend'а на reason — на случай чтения из sessionStorage. */
const CODE_TO_REASON: Record<string, SessionFlag['reason']> = {
  TOKEN_EXPIRED: 'expired',
  TOKEN_REVOKED: 'revoked',
  EMPLOYEE_DISABLED: 'disabled',
  UNAUTHORIZED: 'unauthorized',
};

export function LoginPage() {
  const status = useSessionStore(sessionSelectors.status);
  const consumeFlag = useSessionStore((s) => s.consumeFlag);
  const location = useLocation();
  useDocumentTitle('Sign in');

  // Тост о причине предыдущего разлогина — забираем один раз на mount.
  // Источников два: in-memory флаг store (SPA-навигация) и sessionStorage (после hard-reload).
  useEffect(() => {
    let reason: SessionFlag['reason'] | null = null;

    const flag = consumeFlag();
    if (flag) reason = flag.reason;

    let storedCode: string | null = null;
    try {
      storedCode = sessionStorage.getItem(AUTH_EXIT_REASON_KEY);
      if (storedCode) sessionStorage.removeItem(AUTH_EXIT_REASON_KEY);
    } catch {
      // sessionStorage недоступен — игнорируем
    }
    if (!reason && storedCode) {
      const mapped = CODE_TO_REASON[storedCode];
      if (mapped) reason = mapped;
    }

    if (reason) {
      const toast = FLAG_TOASTS[reason];
      notify.info(toast.title, { description: toast.description });
    }
  }, [consumeFlag]);

  if (status === 'authenticated') {
    const from = (location.state as LocationState)?.from?.pathname ?? DEFAULT_REDIRECT;
    return <Navigate to={from} replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-0">
      {/* Лёгкая радиальная подсветка в углу — живой, но почти невидимый фон. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(94,234,212,0.04),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_90%,rgba(94,234,212,0.025),transparent_60%)]"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <FadeIn delay={0.05} distance={4} className="w-full max-w-[360px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">
            BMS <span className="text-fg-muted/60">{'//'}</span> CONSOLE
          </p>

          <h1 className="mt-3 text-2xl font-normal tracking-tight text-fg-primary">Sign in</h1>
          <p className="mt-1.5 text-sm text-fg-secondary">
            Restricted access. Use your credentials.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="mt-10 flex items-end justify-between font-mono text-[10px] text-fg-muted">
            <span>{APP_VERSION}</span>
            <UtcClock />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
