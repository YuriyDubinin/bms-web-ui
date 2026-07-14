import type { ApiError, AuthErrorReason, Role, SessionUser } from '@shared/api';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export type SessionFlag = {
  reason: AuthErrorReason;
  /** Унифицированное сообщение для UI (login page). */
  message: string;
};

export type SessionState = {
  status: SessionStatus;
  token: string | null;
  expiresAt: string | null;
  customerId: string | null;
  user: SessionUser | null;
  error: ApiError | null;
  /** Флаг-причина последнего разлогина (для тоста на /login). Сбрасывается consume'ом. */
  flag: SessionFlag | null;
};

export type SessionActions = {
  login: (email: string, password: string) => Promise<void>;
  register: (companyName: string, fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearSession: (flag?: SessionFlag | null) => void;
  consumeFlag: () => SessionFlag | null;
};

export type SessionStore = SessionState & SessionActions;

export type { Role };
