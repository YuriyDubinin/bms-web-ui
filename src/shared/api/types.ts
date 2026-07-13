/**
 * Контракт ошибок и базовых типов API. Используется и сетевым клиентом,
 * и сущностями (entities/session и т. п.).
 */

export type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'EMPLOYEE_DISABLED'
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
  public readonly code: ApiErrorCode;
  /** HTTP-статус; 0 для сетевых/тайм-аут ошибок. */
  public readonly status: number;
  public readonly details?: ApiErrorDetail[];

  constructor(code: ApiErrorCode, message: string, status = 0, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const AUTH_ERROR_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'EMPLOYEE_DISABLED',
]);

export function isAuthError(code: ApiErrorCode | string): boolean {
  return AUTH_ERROR_CODES.has(code as ApiErrorCode);
}

export function isCredentialsError(code: ApiErrorCode | string): boolean {
  return code === 'INVALID_CREDENTIALS';
}

// ---- Auth contract ----

export type EmployeeRole = string;

export type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: EmployeeRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  token_type: 'Bearer';
  /** ISO-datetime. */
  expires_at: string;
  employee: Employee;
};

export type LogoutResponse = {
  status: 'LOGGED_OUT';
  message: string;
};

export type EmployeeStatus = 'ENABLED' | 'DISABLED';

export type MeResponse = {
  employee_id: string;
  role: EmployeeRole;
  status: EmployeeStatus;
};

export type PingResponse = {
  status: 'OK';
  message: string;
};
