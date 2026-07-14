import { API_BASE_URL } from './config';

export type ApiErrorDetail = {
  field: string;
  message: string;
};

/**
 * Единый тип ошибки API. `code` — машинный код из тела ответа
 * (INVALID_CREDENTIALS, VALIDATION_ERROR, …) либо служебный
 * NETWORK_ERROR / TIMEOUT для сетевых сбоев (status = 0).
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: ApiErrorDetail[];

  constructor(code: string, message: string, status = 0, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ErrorPayload = {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[];
};

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * UUID v4 для X-Request-ID. `crypto.randomUUID()` доступен только в secure context
 * (HTTPS / localhost) — на обычном http://<ip>:<port> он отсутствует и падает с TypeError
 * ДО отправки запроса. Поэтому даём фолбэки: getRandomValues (есть везде) и Math.random.
 * ID нужен лишь для трассировки, не для безопасности.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // insecure context — падаем в фолбэк
    }
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type RequestOptions = {
  /** Bearer-токен для защищённых запросов. */
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const RETRY_ATTEMPTS = 2; // доп. попытки для идемпотентных GET
const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function performRequest<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { token, signal: externalSignal, timeoutMs } = options;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort('timeout'),
    timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-ID': generateRequestId(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      if (controller.signal.reason === 'timeout') {
        throw new ApiError('TIMEOUT', 'Request timeout', 0);
      }
      throw err; // внешняя отмена — пробрасываем как есть
    }
    throw new ApiError('NETWORK_ERROR', 'Network error', 0);
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }

  if (res.status === 204) return undefined as TResponse;

  const raw = (await res.json().catch(() => null)) as { error?: ErrorPayload } | unknown;

  if (!res.ok) {
    const payload =
      raw && typeof raw === 'object' && 'error' in raw
        ? ((raw as { error?: ErrorPayload }).error ?? null)
        : null;
    throw new ApiError(
      payload?.code ?? 'INTERNAL_ERROR',
      payload?.message ?? `HTTP ${res.status}`,
      res.status,
      payload?.details,
    );
  }

  return raw as TResponse;
}

/**
 * Обёртка над performRequest с повтором при сетевом сбое/таймауте (частая ситуация
 * с «холодным» соединением к удалённому бэкенду). Повторяем только идемпотентные методы:
 * GET/PUT/DELETE (у нас update = полная замена, delete = мягкое, повтор безопасен).
 * POST (create) НЕ повторяем — это могло бы создать дубликат; ошибку обрабатывает
 * вызывающий код (форма показывает сообщение и даёт повторить вручную).
 */
async function request<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<TResponse> {
  const idempotent = method === 'GET' || method === 'PUT' || method === 'DELETE';
  const maxAttempts = idempotent ? RETRY_ATTEMPTS + 1 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await performRequest<TResponse>(method, path, body, options);
    } catch (err: unknown) {
      lastError = err;
      const retriable =
        err instanceof ApiError && (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT');
      if (!retriable || options.signal?.aborted || attempt === maxAttempts) throw err;
      await delay(300 * attempt);
      if (options.signal?.aborted) throw err;
    }
  }

  throw lastError;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PUT', path, body, options),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, body, options),
};
