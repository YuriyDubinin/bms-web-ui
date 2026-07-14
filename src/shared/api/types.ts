/**
 * Контракт ошибок и базовых типов API. Используется и сетевым клиентом,
 * и сущностями (entities/session и т. п.).
 */

export type ApiErrorCode =
  | 'INVALID_JSON'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'USER_DISABLED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export type ApiErrorDetail = {
  field: string;
  message: string;
};

export type ApiErrorPayload = {
  code: ApiErrorCode | string;
  message: string;
  details?: ApiErrorDetail[];
};

export class ApiError extends Error {
  public readonly code: ApiErrorCode | string;
  /** HTTP-статус; 0 для сетевых/тайм-аут ошибок. */
  public readonly status: number;
  public readonly details?: ApiErrorDetail[];

  constructor(code: ApiErrorCode | string, message: string, status = 0, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const AUTH_ERROR_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'USER_DISABLED',
]);

export function isAuthError(code: ApiErrorCode | string): boolean {
  return AUTH_ERROR_CODES.has(code);
}

export function isCredentialsError(code: ApiErrorCode | string): boolean {
  return code === 'INVALID_CREDENTIALS';
}

export function isForbiddenError(code: ApiErrorCode | string): boolean {
  return code === 'FORBIDDEN';
}

export function isNotFoundError(code: ApiErrorCode | string): boolean {
  return typeof code === 'string' && code.endsWith('_NOT_FOUND');
}

export function isExistsError(code: ApiErrorCode | string): boolean {
  return typeof code === 'string' && (code.endsWith('_EXISTS') || code === 'EMAIL_EXISTS');
}

// ---- Pagination / lists ----

export type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type ListResponse<T> = {
  items: T[];
  pagination: Pagination;
};

export type SortOrder = 'asc' | 'desc';

export type ListParams = {
  page?: number;
  page_size?: number;
  sort_by?: string;
  order?: SortOrder;
  search?: string;
};

/**
 * Собирает query-строку из списка параметров: пропускает undefined/null/'',
 * булевы приводит к 'true'/'false'. Используется всеми `*Api.ts` со списками.
 */
export function buildQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, typeof value === 'boolean' ? String(value) : String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ---- Auth / session contract ----

export const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
};

export type RegisterRequest = {
  company_name: string;
  full_name: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type Session = {
  token: string;
  token_type: 'Bearer';
  /** ISO-datetime. */
  expires_at: string;
  customer_id: string;
  user: SessionUser;
};

export type LogoutResponse = {
  status: 'LOGGED_OUT';
  message: string;
};

export type MeResponse = {
  user_id: string;
  customer_id: string;
  role: Role;
};

export type PingResponse = {
  status: 'OK';
  message: string;
};

/** Ролевой гейт: управление организацией и операторами доступно только OWNER/ADMIN. */
export function isOwnerOrAdminRole(role: Role | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

// ---- Entity type enum (shared across links/attendees/custom-fields) ----

export const ENTITY_TYPES = [
  'PROJECT',
  'SERVICE',
  'CLIENT',
  'TASK',
  'CALENDAR_EVENT',
  'CUSTOMER_USER',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  PROJECT: 'Project',
  SERVICE: 'Service',
  CLIENT: 'Client',
  TASK: 'Task',
  CALENDAR_EVENT: 'Event',
  CUSTOMER_USER: 'Team member',
};

export const ENTITY_TYPE_OPTIONS = ENTITY_TYPES.map((t) => ({ value: t, label: ENTITY_TYPE_LABELS[t] }));
