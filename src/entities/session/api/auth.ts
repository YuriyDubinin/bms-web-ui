import {
  api,
  type LoginRequest,
  type LoginResponse,
  type LogoutResponse,
  type MeResponse,
} from '@shared/api';

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/api/auth/login', payload, { auth: false });
}

export function logout(): Promise<LogoutResponse> {
  return api.post<LogoutResponse>('/api/auth/logout');
}

export function me(signal?: AbortSignal): Promise<MeResponse> {
  return api.get<MeResponse>('/api/me', { signal });
}
