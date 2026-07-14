import { api } from './client';

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';

export type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
};

/** Ответ POST /auth/login и модель хранимой сессии. */
export type Session = {
  token: string;
  token_type: string;
  /** RFC3339, момент истечения токена (сейчас +24 часа). */
  expires_at: string;
  customer_id: string;
  user: SessionUser;
};

export type MeResponse = {
  user_id: string;
  customer_id: string;
  role: Role;
};

export type LogoutResponse = {
  status: string;
  message: string;
};

/** Публичный эндпоинт — токен не нужен. */
export function login(email: string, password: string): Promise<Session> {
  return api.post<Session>('/auth/login', { email, password });
}

/** Отзывает текущий токен на сервере. Требует валидный Bearer. */
export function logout(token: string): Promise<LogoutResponse> {
  return api.post<LogoutResponse>('/auth/logout', undefined, { token });
}

/** Проверка/восстановление сессии при загрузке приложения. */
export function me(token: string, signal?: AbortSignal): Promise<MeResponse> {
  return api.get<MeResponse>('/me', { token, signal });
}
