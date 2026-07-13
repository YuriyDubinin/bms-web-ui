import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { ApiError, isAuthError, type AuthErrorReason } from '@shared/api';
import { login as apiLogin, logout as apiLogout, me as apiMe } from '../api';
import type { SessionStore } from './types';

const TOKEN_SAFETY_MARGIN_MS = 30_000;

function flagMessageFor(reason: AuthErrorReason): string {
  switch (reason) {
    case 'expired':
      return 'Сессия истекла. Войдите снова.';
    case 'revoked':
      return 'Сессия отозвана. Войдите снова.';
    case 'disabled':
      return 'Аккаунт отключён. Обратитесь к администратору.';
    case 'unauthorized':
    default:
      return 'Требуется авторизация.';
  }
}

const initialState = {
  status: 'idle' as const,
  token: null,
  expiresAt: null,
  employee: null,
  error: null,
  flag: null,
};

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        login: async (email, password) => {
          set({ status: 'loading', error: null }, false, 'session/login:start');
          try {
            const res = await apiLogin({ email, password });
            set(
              {
                status: 'authenticated',
                token: res.token,
                expiresAt: res.expires_at,
                employee: res.employee,
                error: null,
                flag: null,
              },
              false,
              'session/login:success',
            );
          } catch (err: unknown) {
            const apiErr = err instanceof ApiError ? err : null;
            set(
              {
                status: 'unauthenticated',
                token: null,
                expiresAt: null,
                employee: null,
                error: apiErr,
              },
              false,
              'session/login:error',
            );
            throw err;
          }
        },

        logout: async () => {
          // Лучшее усилие: дёргаем бэкенд, но локально чистим в любом случае.
          try {
            if (get().token) await apiLogout();
          } catch {
            // ignore — серверная ошибка не должна блокировать локальный выход
          } finally {
            get().clearSession(null);
          }
        },

        hydrate: async () => {
          const { token, expiresAt } = get();
          // Нет токена — сразу unauthenticated.
          if (!token || !expiresAt) {
            set({ status: 'unauthenticated' }, false, 'session/hydrate:no-token');
            return;
          }
          // Истёк до запроса — чистим.
          if (new Date(expiresAt).getTime() <= Date.now() + TOKEN_SAFETY_MARGIN_MS) {
            get().clearSession({ reason: 'expired', message: flagMessageFor('expired') });
            return;
          }
          set({ status: 'loading' }, false, 'session/hydrate:start');
          try {
            const meRes = await apiMe();
            if (meRes.status === 'DISABLED') {
              get().clearSession({ reason: 'disabled', message: flagMessageFor('disabled') });
              return;
            }
            set({ status: 'authenticated' }, false, 'session/hydrate:success');
          } catch (err: unknown) {
            if (err instanceof ApiError && isAuthError(err.code)) {
              // clearSession уже вызовется через emitAuthError → interceptor;
              // здесь просто гарантируем итоговое состояние.
              return;
            }
            // Сеть/таймаут/5xx — оставляем сохранённый токен, но переводим в unauthenticated,
            // чтобы guard'ы не пустили пользователя без подтверждения /me.
            set(
              { status: 'unauthenticated', error: err instanceof ApiError ? err : null },
              false,
              'session/hydrate:error',
            );
          }
        },

        clearSession: (flag = null) => {
          set(
            {
              status: 'unauthenticated',
              token: null,
              expiresAt: null,
              employee: null,
              error: null,
              flag,
            },
            false,
            'session/clearSession',
          );
        },

        consumeFlag: () => {
          const flag = get().flag;
          if (flag) set({ flag: null }, false, 'session/consumeFlag');
          return flag;
        },
      }),
      {
        name: 'bms.auth',
        storage: createJSONStorage(() => localStorage),
        // Не сохраняем status/error/flag — это runtime-состояние, не сессия.
        partialize: (s) => ({
          token: s.token,
          expiresAt: s.expiresAt,
          employee: s.employee,
        }),
        version: 1,
      },
    ),
    { name: 'session', enabled: import.meta.env.DEV },
  ),
);

// ---- Selectors ----

export const sessionSelectors = {
  status: (s: SessionStore) => s.status,
  token: (s: SessionStore) => s.token,
  employee: (s: SessionStore) => s.employee,
  error: (s: SessionStore) => s.error,
  isAuthenticated: (s: SessionStore) => s.status === 'authenticated',
};

/**
 * Токен считается валидным, если он есть И не истёк (с запасом 30с).
 * Используется token-провайдером в shared/api/client.
 */
export function isTokenValid(state = useSessionStore.getState()): boolean {
  if (!state.token || !state.expiresAt) return false;
  return new Date(state.expiresAt).getTime() > Date.now() + TOKEN_SAFETY_MARGIN_MS;
}

export { flagMessageFor };
