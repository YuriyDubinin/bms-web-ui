import { API_BASE_URL } from '../config';
import {
  ApiError,
  isAuthError,
  type ApiErrorCode,
  type ApiErrorPayload,
  type PingResponse,
} from './types';
import { authErrorReasonFromCode, emitAuthError } from './interceptor';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Провайдер токена. Регистрируется из app-слоя, чтобы shared не знал про entities/session.
 * Должен возвращать токен ТОЛЬКО если он валиден (по сроку); проверка — на стороне провайдера.
 */
export type TokenProvider = () => string | null;

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

type RequestOptions = {
  /** Если true — Authorization не добавляется (полезно для /login и /ping). */
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Переопределение таймаута, мс. По умолчанию {@link DEFAULT_TIMEOUT_MS}.
   * Нужно для долгих синхронных операций (deploy, system/main по медленному
   * SSH-линку) — иначе клиент прервёт запрос раньше, чем бэк успеет ответить.
   */
  timeoutMs?: number;
};

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { auth = true, signal: externalSignal, headers = {}, timeoutMs } = options;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort('timeout'),
    timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  // Прокидываем внешний AbortSignal в наш контроллер, чтобы поддержать React Query / страничные cancel-сценарии.
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenProvider?.();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      // Различаем причину прерывания: наш таймаут vs внешняя отмена.
      if (controller.signal.reason === 'timeout') {
        throw new ApiError('TIMEOUT', 'Request timeout', 0);
      }
      // Внешняя отмена — пробрасываем как есть, чтобы React Query не считал это ошибкой запроса.
      throw err;
    }
    throw new ApiError('NETWORK_ERROR', 'Network error', 0);
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }

  if (res.status === 204) return undefined as TResponse;

  // Попытка распарсить JSON; на пустом теле / битом JSON отдадим INTERNAL_ERROR с HTTP-статусом.
  const raw = (await res.json().catch(() => null)) as { error?: ApiErrorPayload } | unknown;

  if (!res.ok) {
    const errorPayload =
      raw && typeof raw === 'object' && 'error' in raw
        ? ((raw as { error?: ApiErrorPayload }).error ?? null)
        : null;
    const code = (errorPayload?.code ?? 'INTERNAL_ERROR') as ApiErrorCode;
    const message = errorPayload?.message ?? `HTTP ${res.status}`;
    const apiError = new ApiError(code, message, res.status, errorPayload?.details);
    // Разлогиниваем при любом протухании токена: либо известный auth-код,
    // либо «голый» HTTP 401 без распознаваемого кода в теле ответа.
    if (isAuthError(code) || res.status === 401) {
      emitAuthError(authErrorReasonFromCode(code), apiError);
    }
    throw apiError;
  }

  return raw as TResponse;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, body, options),
};

// Ping — публичный, без авторизации.
export function ping(signal?: AbortSignal): Promise<PingResponse> {
  return api.get<PingResponse>('/api/ping', { auth: false, signal });
}
