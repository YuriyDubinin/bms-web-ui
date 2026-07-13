export { api, ping, setTokenProvider } from './client';
export type { TokenProvider } from './client';

export { createQueryClient, setQueryErrorHandler } from './query-client';
export type { QueryErrorHandler } from './query-client';

export {
  setAuthErrorHandler,
  emitAuthError,
  authErrorReasonFromCode,
  AUTH_EXIT_REASON_KEY,
} from './interceptor';
export type { AuthErrorReason, AuthErrorHandler } from './interceptor';

export {
  ApiError,
  isAuthError,
  isCredentialsError,
} from './types';
export type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorPayload,
  Employee,
  EmployeeRole,
  EmployeeStatus,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  PingResponse,
} from './types';
