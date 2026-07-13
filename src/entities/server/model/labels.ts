import type { ServerAuthMethod, ServerEnvironment, ServerProtocol } from './types';

/** Человекочитаемые подписи окружений. */
export const SERVER_ENVIRONMENT_LABELS: Record<ServerEnvironment, string> = {
  PRODUCTION: 'Production',
  STAGING: 'Staging',
  DEVELOPMENT: 'Development',
  TESTING: 'Testing',
  OTHER: 'Other',
};

/** Подписи протоколов. */
export const SERVER_PROTOCOL_LABELS: Record<ServerProtocol, string> = {
  SSH: 'SSH',
  WINRM: 'WinRM',
  RDP: 'RDP',
};

/** Подписи методов аутентификации. */
export const SERVER_AUTH_METHOD_LABELS: Record<ServerAuthMethod, string> = {
  PASSWORD: 'Password',
  PRIVATE_KEY: 'Private key',
  AGENT: 'SSH agent',
};
