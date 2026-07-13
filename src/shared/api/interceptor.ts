import type { ApiError } from './types';

/** Имя ключа sessionStorage с кодом ошибки последнего разлогина. Читает LoginPage. */
export const AUTH_EXIT_REASON_KEY = 'auth.exitReason';

export type AuthErrorReason = 'expired' | 'revoked' | 'disabled' | 'unauthorized';

export type AuthErrorHandler = (reason: AuthErrorReason, error: ApiError) => void;

let handler: AuthErrorHandler | null = null;

/**
 * Регистрация обработчика auth-ошибок. Вызывается из app-слоя один раз при бутстрапе —
 * так мы избегаем циклической зависимости shared → entities.
 */
export function setAuthErrorHandler(fn: AuthErrorHandler | null): void {
  handler = fn;
}

export function emitAuthError(reason: AuthErrorReason, error: ApiError): void {
  handler?.(reason, error);
}

export function authErrorReasonFromCode(code: string): AuthErrorReason {
  switch (code) {
    case 'TOKEN_EXPIRED':
      return 'expired';
    case 'TOKEN_REVOKED':
      return 'revoked';
    case 'EMPLOYEE_DISABLED':
      return 'disabled';
    default:
      return 'unauthorized';
  }
}
