import type { RegistryCheckResult } from './types';

export type CheckTone = 'success' | 'warning' | 'error';

/**
 * Человекочитаемая интерпретация результата connect/ping.
 * Успех определяется по `connected === true`, а не по HTTP-коду.
 */
export function describeRegistryCheck(result: RegistryCheckResult): {
  tone: CheckTone;
  title: string;
} {
  if (result.connected) {
    return {
      tone: 'success',
      title: result.authenticated ? 'Connected' : 'Connected (anonymous)',
    };
  }
  switch (result.status) {
    case 'AUTH_FAILED':
      return { tone: 'error', title: 'Authentication failed' };
    case 'UNREACHABLE':
      return { tone: 'error', title: 'Registry unreachable' };
    case 'TLS_ERROR':
      return { tone: 'warning', title: 'TLS certificate problem' };
    default:
      return { tone: 'error', title: 'Connection failed' };
  }
}
