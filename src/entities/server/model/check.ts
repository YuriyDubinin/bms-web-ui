import type { ServerCheckResult, ServerInstallKeyResult } from './types';

export type CheckTone = 'success' | 'warning' | 'error' | 'info';

/**
 * Человекочитаемая интерпретация результата remote/connect и remote/ping.
 * Успех определяется по `connected === true`, а не по HTTP-коду.
 */
export function describeServerCheck(result: ServerCheckResult): {
  tone: CheckTone;
  title: string;
} {
  if (result.connected) {
    return {
      tone: 'success',
      title: result.method ? `Connected (via ${result.method})` : 'Connected',
    };
  }
  switch (result.status) {
    case 'AUTH_FAILED':
      return { tone: 'error', title: 'Invalid credentials' };
    case 'UNREACHABLE':
      return { tone: 'info', title: 'Server unreachable' };
    case 'TIMEOUT':
      return { tone: 'info', title: 'Connection timed out' };
    case 'ERROR':
      return { tone: 'error', title: 'Session check failed' };
    default:
      return { tone: 'error', title: 'Connection failed' };
  }
}

/**
 * Человекочитаемая интерпретация результата install-key. Главный признак успеха —
 * `ssh_key_installed === true` (значит, ключ дописан И верификация по ключу прошла).
 * Отдельно подсвечиваем редкий кейс «дописали, но sshd ключ не принял» (warning).
 */
export function describeServerInstallKey(r: ServerInstallKeyResult): {
  tone: CheckTone;
  title: string;
} {
  if (r.ssh_key_installed) {
    return {
      tone: 'success',
      title: r.already_installed ? 'Key already installed' : 'Key installed and verified',
    };
  }
  if (r.installed && !r.verified) {
    return { tone: 'warning', title: 'Key appended, verification failed' };
  }
  switch (r.status) {
    case 'AUTH_FAILED':
      return { tone: 'error', title: 'Invalid credentials' };
    case 'UNREACHABLE':
      return { tone: 'info', title: 'Server unreachable' };
    case 'TIMEOUT':
      return { tone: 'info', title: 'Connection timed out' };
    case 'ERROR':
      return { tone: 'error', title: 'Install failed' };
    default:
      return { tone: 'error', title: 'Install failed' };
  }
}
