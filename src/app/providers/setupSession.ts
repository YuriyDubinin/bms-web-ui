import {
  ApiError,
  AUTH_EXIT_REASON_KEY,
  isAuthError,
  setAuthErrorHandler,
  setQueryErrorHandler,
  setTokenProvider,
} from '@shared/api';
import { notify } from '@shared/ui';
import { flagMessageFor, isTokenValid, useSessionStore } from '@entities/session';

/**
 * Связывает shared/api с entities/session через инверсию зависимостей:
 * — token-провайдер читает токен из store (только если он валиден);
 * — auth-error handler чистит сессию (только если был токен) и пишет sessionStorage-флаг;
 * — query-error handler показывает toast для не-auth, не-валидационных ошибок.
 * Вызывается из main.tsx один раз, до первого запроса.
 */
export function setupSession(): void {
  setTokenProvider(() => {
    const state = useSessionStore.getState();
    return isTokenValid(state) ? state.token : null;
  });

  setAuthErrorHandler((reason, error) => {
    const state = useSessionStore.getState();
    // Игнорируем, если токена не было — авторизация и так отсутствует.
    if (state.token == null) return;
    try {
      sessionStorage.setItem(AUTH_EXIT_REASON_KEY, error.code);
    } catch {
      // sessionStorage может быть недоступен (private mode) — не критично, есть in-store флаг.
    }
    state.clearSession({
      reason,
      message: error.message || flagMessageFor(reason),
    });
    // Редирект на /login сделает route-guard в AppLayout автоматически.
  });

  setQueryErrorHandler((err) => {
    if (err instanceof ApiError) {
      // auth-ошибки полностью обрабатывает auth-error handler выше
      // (включая «голый» 401 без распознаваемого кода).
      if (isAuthError(err.code) || err.status === 401) return;
      // 422 — валидация форм; распределяется через setError в форме, тостом не шумим.
      if (err.status === 422) return;
      notify.error(err.message || 'Request failed', { code: err.code });
      return;
    }
    notify.error('Something went wrong');
  });
}
