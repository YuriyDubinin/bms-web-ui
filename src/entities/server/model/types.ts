/** Контракт API подключений к серверам. */

export const SERVER_PROTOCOLS = ['SSH', 'WINRM', 'RDP'] as const;
export type ServerProtocol = (typeof SERVER_PROTOCOLS)[number];

export const SERVER_AUTH_METHODS = ['PASSWORD', 'PRIVATE_KEY', 'AGENT'] as const;
export type ServerAuthMethod = (typeof SERVER_AUTH_METHODS)[number];

export const SERVER_ENVIRONMENTS = [
  'PRODUCTION',
  'STAGING',
  'DEVELOPMENT',
  'TESTING',
  'OTHER',
] as const;
export type ServerEnvironment = (typeof SERVER_ENVIRONMENTS)[number];

export type Server = {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: ServerProtocol;
  username?: string;
  auth_method: ServerAuthMethod;
  description?: string;
  environment: ServerEnvironment;
  provider?: string;
  location?: string;
  tags?: string[];
  /** Заданы ли секреты (сами секреты наружу не возвращаются). */
  has_password: boolean;
  has_private_key: boolean;
  /** Установлен ли публичный SSH-ключ приложения в authorized_keys сервера и подтверждён ли вход по ключу. */
  ssh_key_installed?: boolean;
  is_active: boolean;
  // Факты окружения — заполняются после remote/connect, через CRUD не редактируются.
  os?: string;
  os_version?: string;
  arch?: string;
  kernel_version?: string;
  remote_hostname?: string;
  cpu_cores?: number;
  memory_total_bytes?: number;
  disk_total_bytes?: number;
  last_status?: string;
  last_checked_at?: string;
  created_at: string;
  updated_at?: string;
};

export type ServerPagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type ServerListResponse = {
  items: Server[];
  pagination: ServerPagination;
};

export type ServerSortBy = 'created_at' | 'updated_at' | 'name' | 'host' | 'environment';
export type SortOrder = 'asc' | 'desc';

export type ServerListParams = {
  page?: number;
  page_size?: number;
  environment?: ServerEnvironment;
  protocol?: ServerProtocol;
  auth_method?: ServerAuthMethod;
  is_active?: boolean;
  search?: string;
  sort_by?: ServerSortBy;
  order?: SortOrder;
};

export type CreateServerInput = {
  name: string;
  host: string;
  port?: number;
  protocol?: ServerProtocol;
  username?: string;
  auth_method?: ServerAuthMethod;
  password?: string;
  private_key?: string;
  private_key_passphrase?: string;
  description?: string;
  environment?: ServerEnvironment;
  provider?: string;
  location?: string;
  tags?: string[];
};

export type UpdateServerInput = {
  id: string;
  name: string;
  host: string;
  port?: number;
  protocol?: ServerProtocol;
  username?: string;
  auth_method?: ServerAuthMethod;
  /** Не слать ключ → секрет не меняется; "" → очистить; "x" → заменить. */
  password?: string;
  private_key?: string;
  private_key_passphrase?: string;
  description?: string;
  environment?: ServerEnvironment;
  provider?: string;
  location?: string;
  tags?: string[];
  is_active?: boolean;
};

export type DeleteServerResponse = {
  id: string;
  status: 'DELETED';
  deleted_at: string;
};

export type ServerCheckStatus =
  | 'OK'
  | 'AUTH_FAILED'
  | 'UNREACHABLE'
  | 'TIMEOUT'
  | 'ERROR'
  | string;

/** Способ входа: publickey — наш ключ уже на сервере; password — вошли паролем; '' — вход не удался. */
export type ServerConnectMethod = 'publickey' | 'password' | '' | string;

/**
 * Общая форма ответа remote/connect и remote/ping (читать по `connected`/`status`, не по HTTP-коду —
 * недоступность сервера это 200 с connected:false).
 */
export type ServerCheckResult = {
  id: string;
  connected: boolean;
  method: ServerConnectMethod;
  status: ServerCheckStatus;
  message: string;
  /** Только ping: новое состояние is_active (успех→true, провал→false). */
  is_active?: boolean;
  // Факты — только connect на успехе.
  remote_hostname?: string;
  os?: string;
  kernel_version?: string;
  arch?: string;
  cpu_cores?: number;
  checked_at: string;
};

export type ServerConnectResult = ServerCheckResult;
export type ServerPingResult = ServerCheckResult;

/**
 * Результат POST /api/servers/remote/install-key — установка SSH-ключа приложения
 * в authorized_keys выбранного сервера + верификация. Любые сетевые/auth-проблемы
 * приходят как 200 OK с подробностями в теле (читать по `ssh_key_installed`/`status`).
 */
export type ServerInstallKeyResult = {
  id: string;
  /** Удалось ли войти паролем на этапе установки. */
  connected: boolean;
  /** Ключ уже был в authorized_keys (идемпотентный повтор). */
  already_installed: boolean;
  /** Ключ был дописан в authorized_keys в этом вызове. */
  installed: boolean;
  /** Повторный коннект уже по ключу прошёл — ключ реально работает. */
  verified: boolean;
  /** Итоговый флаг в БД: true ⇔ verified=true. После 200 фронт читает его из /servers/list. */
  ssh_key_installed: boolean;
  status: ServerCheckStatus;
  message: string;
  checked_at: string;
};
