/** Контракт API SSH-ключа приложения (GET/POST/DELETE /api/system/ssh/*). */

export type SshKeyInfo = {
  exists: boolean;
  valid: boolean;
  /** true только если ключ создан текущим вызовом create. */
  created: boolean;
  message: string;
  type: string;
  /** Готовая строка для ~/.ssh/authorized_keys. */
  public_key: string;
  fingerprint: string;
  private_key_path: string;
  public_key_path: string;
  created_at: string;
};

/**
 * Нормализованное состояние ключа (выводится из ответа /ssh/check):
 *  - valid   — 200, ключ готов к работе;
 *  - missing — 404 SSH_KEY_NOT_FOUND, файла нет → предложить создать;
 *  - invalid — 422 SSH_KEY_INVALID, файл битый → предложить пересоздать;
 *  - error   — прочая ошибка проверки.
 */
export type SshKeyState = 'valid' | 'missing' | 'invalid' | 'error';

export type SshCheckResult = {
  state: SshKeyState;
  message: string;
  code?: string;
  /** Заполнено только при state==='valid'. */
  info?: SshKeyInfo;
};

export type SshDeleteResponse = {
  status: 'DELETED';
  private_key_path: string;
  public_key_path: string;
};
