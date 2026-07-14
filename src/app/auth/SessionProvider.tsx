import type { ReactNode } from 'react';
import { useSession } from './useSession';
import { SessionContext } from './SessionContext';

/**
 * Единственный владелец состояния сессии. Оборачивает приложение, чтобы токен и
 * методы login/logout были доступны через useAuth() из любой страницы без prop-drilling.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
