import { createContext, useContext } from 'react';
import type { UseSession } from './useSession';

/** Контекст авторизации. Значение задаёт SessionProvider (единственный инстанс useSession). */
export const SessionContext = createContext<UseSession | null>(null);

/** Доступ к сессии (статус, пользователь, токен, login/logout) из любого места под провайдером. */
export function useAuth(): UseSession {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри <SessionProvider>');
  }
  return ctx;
}
