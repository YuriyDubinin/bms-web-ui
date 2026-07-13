import { ApiError, api, isAuthError } from '@shared/api';
import type { SshCheckResult, SshDeleteResponse, SshKeyInfo } from '../model';

/**
 * Строгая проверка ключа. Недостающий/битый ключ — это 404/422, а не «ошибка приложения»,
 * поэтому ApiError доменных кодов мы перехватываем и превращаем в нормализованный state.
 * Auth-ошибки (401) пробрасываем — их обрабатывает глобальный auth-handler (разлогин).
 */
export async function getSshCheck(signal?: AbortSignal): Promise<SshCheckResult> {
  try {
    const info = await api.get<SshKeyInfo>('/api/system/ssh/check', { signal });
    return { state: 'valid', message: info.message, info };
  } catch (err) {
    if (err instanceof ApiError) {
      if (isAuthError(err.code)) throw err;
      const code = err.code as string;
      if (code === 'SSH_KEY_NOT_FOUND') return { state: 'missing', message: err.message, code };
      if (code === 'SSH_KEY_INVALID') return { state: 'invalid', message: err.message, code };
      return { state: 'error', message: err.message, code };
    }
    throw err;
  }
}

/** Создать ключ (идемпотентно: существующий не перезаписывается). */
export function createSshKey(): Promise<SshKeyInfo> {
  return api.post<SshKeyInfo>('/api/system/ssh/create');
}

/** Физически удалить файлы ключа (приватный + .pub). */
export function deleteSshKey(): Promise<SshDeleteResponse> {
  return api.delete<SshDeleteResponse>('/api/system/ssh/delete');
}
