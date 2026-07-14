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
  isForbiddenError,
  isNotFoundError,
  isExistsError,
  isOwnerOrAdminRole,
  buildQuery,
  ROLES,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_OPTIONS,
} from './types';
export type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorPayload,
  Role,
  SessionUser,
  RegisterRequest,
  LoginRequest,
  Session,
  LogoutResponse,
  MeResponse,
  PingResponse,
  Pagination,
  ListResponse,
  ListParams,
  SortOrder,
  EntityType,
} from './types';
