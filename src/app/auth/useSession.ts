import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, login as apiLogin, logout as apiLogout, me as apiMe } from '@app/api';
import type { Session, SessionUser } from '@app/api';

const STORAGE_KEY = 'bms.session';

export type SessionStatus = 'authenticated' | 'unauthenticated';

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.token === 'string' &&
    typeof s.expires_at === 'string' &&
    !!s.user &&
    typeof s.user === 'object'
  );
}

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return null;
    // Токен с истёкшим сроком не считаем валидным — сразу требуем повторный вход.
    if (new Date(parsed.expires_at).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(session: Session | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage недоступен — сессия проживёт только в памяти
  }
}

export type UseSession = {
  status: SessionStatus;
  user: SessionUser | null;
  /** Bearer-токен текущей сессии для защищённых запросов; null — если не авторизован. */
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * Единый источник правды по авторизации. Держите ОДИН инстанс в корне приложения.
 * При старте оптимистично поднимает сессию из localStorage (мгновенный рендер без
 * мигания) и параллельно валидирует токен через /me: при 401 — чистит и уводит на вход.
 */
export function useSession(): UseSession {
  const [session, setSession] = useState<Session | null>(() => readStored());
  const validatedRef = useRef(false);

  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    const current = readStored();
    if (!current) return;

    const controller = new AbortController();
    apiMe(current.token, controller.signal).catch((err: unknown) => {
      // Токен недействителен — разлогиниваем. Сетевые сбои игнорируем,
      // чтобы временная недоступность сети не выкидывала пользователя.
      if (err instanceof ApiError && err.status === 401) {
        persist(null);
        setSession(null);
      }
    });

    return () => controller.abort();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await apiLogin(email.trim(), password);
    persist(next);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token;
    try {
      if (token) await apiLogout(token);
    } catch {
      // Ошибка сервера не должна блокировать локальный выход.
    } finally {
      persist(null);
      setSession(null);
    }
  }, [session]);

  return {
    status: session ? 'authenticated' : 'unauthenticated',
    user: session?.user ?? null,
    token: session?.token ?? null,
    login,
    logout,
  };
}
