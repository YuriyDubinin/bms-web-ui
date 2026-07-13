/** Контракт API подключений к Docker Registry. */

export const REGISTRY_TYPES = [
  'DOCKERHUB',
  'GHCR',
  'GITLAB',
  'HARBOR',
  'ECR',
  'GENERIC',
] as const;

export type RegistryType = (typeof REGISTRY_TYPES)[number];

export type Registry = {
  id: string;
  name: string;
  type: RegistryType;
  url: string;
  username?: string;
  email?: string;
  namespace?: string;
  is_default: boolean;
  is_active: boolean;
  insecure: boolean;
  /** Сохранён ли пароль (наружу сам пароль не возвращается). */
  has_credentials: boolean;
  last_status?: string;
  last_checked_at?: string;
  created_at: string;
  updated_at?: string;
};

export type RegistryPagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type RegistryListResponse = {
  items: Registry[];
  pagination: RegistryPagination;
};

export type RegistrySortBy = 'created_at' | 'updated_at' | 'name' | 'type';
export type SortOrder = 'asc' | 'desc';

export type RegistryListParams = {
  page?: number;
  page_size?: number;
  type?: RegistryType;
  is_active?: boolean;
  is_default?: boolean;
  search?: string;
  sort_by?: RegistrySortBy;
  order?: SortOrder;
};

export type CreateRegistryInput = {
  name: string;
  type: RegistryType;
  url: string;
  username?: string;
  password?: string;
  email?: string;
  namespace?: string;
  is_default?: boolean;
  insecure?: boolean;
};

export type UpdateRegistryInput = {
  id: string;
  name: string;
  type: RegistryType;
  url: string;
  /** Не слать ключ → пароль не меняется; "" → очистить; "x" → заменить. */
  username?: string;
  password?: string;
  email?: string;
  namespace?: string;
  is_default?: boolean;
  is_active?: boolean;
  insecure?: boolean;
};

export type DeleteRegistryResponse = {
  id: string;
  status: 'DELETED';
  deleted_at: string;
};

export type RegistryCheckStatus =
  | 'OK'
  | 'AUTH_FAILED'
  | 'UNREACHABLE'
  | 'TLS_ERROR'
  | 'ERROR'
  | string;

/** Общая форма ответа connect/ping (читать по `connected`, не по HTTP-коду). */
export type RegistryCheckResult = {
  connected: boolean;
  authenticated: boolean;
  status: RegistryCheckStatus;
  message: string;
  api_version?: string;
  /** Новое состояние записи после проверки (connect включает при успехе; ping — в обе стороны). */
  is_active?: boolean;
  checked_at: string;
};

/** connect / ping — оба по id сохранённой записи, возвращают актуальный is_active. */
export type RegistryActionResult = RegistryCheckResult & { id: string };
export type RegistryConnectResult = RegistryActionResult;
export type RegistryPingResult = RegistryActionResult;

/** Образ из ответа /api/registries/images (DockerHub-поля опциональны для registry_v2). */
export type RegistryImage = {
  name: string;
  tags: string[];
  tag_count: number;
  description?: string;
  is_private?: boolean;
  pull_count?: number;
  star_count?: number;
  last_updated?: string;
};

export type RegistryImagesResponse = {
  registry_id: string;
  type: RegistryType;
  source: 'hub_api' | 'registry_v2' | string;
  namespace: string;
  total: number;
  count: number;
  images: RegistryImage[];
};

export type RegistryImagesInput = {
  id: string;
  namespace?: string;
};
