import {
  api,
  type LoginRequest,
  type LogoutResponse,
  type MeResponse,
  type RegisterRequest,
  type Session,
} from '@shared/api';

export function register(payload: RegisterRequest): Promise<Session> {
  return api.post<Session>('/api/auth/register', payload, { auth: false });
}

export function login(payload: LoginRequest): Promise<Session> {
  return api.post<Session>('/api/auth/login', payload, { auth: false });
}

export function logout(): Promise<LogoutResponse> {
  return api.post<LogoutResponse>('/api/auth/logout');
}

export function me(signal?: AbortSignal): Promise<MeResponse> {
  return api.get<MeResponse>('/api/me', { signal });
}
