import { api } from '@shared/api';
import type {
  CreateServerInput,
  DeleteServerResponse,
  Server,
  ServerConnectResult,
  ServerInstallKeyResult,
  ServerListParams,
  ServerListResponse,
  ServerPingResult,
  UpdateServerInput,
} from '../model';

function buildQuery(params: ServerListParams): string {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.page_size != null) qs.set('page_size', String(params.page_size));
  if (params.environment) qs.set('environment', params.environment);
  if (params.protocol) qs.set('protocol', params.protocol);
  if (params.auth_method) qs.set('auth_method', params.auth_method);
  if (params.is_active != null) qs.set('is_active', String(params.is_active));
  if (params.search) qs.set('search', params.search);
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.order) qs.set('order', params.order);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function listServers(
  params: ServerListParams,
  signal?: AbortSignal,
): Promise<ServerListResponse> {
  return api.get<ServerListResponse>(`/api/servers/list${buildQuery(params)}`, { signal });
}

export function createServer(input: CreateServerInput): Promise<Server> {
  return api.post<Server>('/api/servers/create', input);
}

export function updateServer(input: UpdateServerInput): Promise<Server> {
  return api.put<Server>('/api/servers/update', input);
}

export function deleteServer(id: string): Promise<DeleteServerResponse> {
  return api.delete<DeleteServerResponse>('/api/servers/delete', { id });
}

/** connect — SSH-вход (ключ → пароль), проверка сессии + сбор фактов (os/cpu/…). is_active не меняет. */
export function connectServer(id: string): Promise<ServerConnectResult> {
  return api.post<ServerConnectResult>('/api/servers/remote/connect', { id });
}

/** ping — лёгкий health-check; переключает is_active (успех→true, провал→false). */
export function pingServer(id: string): Promise<ServerPingResult> {
  return api.post<ServerPingResult>('/api/servers/remote/ping', { id });
}

/**
 * install-key — бутстрап доверия: вход по паролю → дописывание публичного ключа
 * приложения в authorized_keys → верификация входом по ключу. При успехе сервер
 * проставляет servers.ssh_key_installed=true. Сетевые/auth-проблемы возвращаются
 * как 200 OK с подробностями в теле; читать по `ssh_key_installed` + `status`.
 */
export function installServerKey(id: string): Promise<ServerInstallKeyResult> {
  return api.post<ServerInstallKeyResult>('/api/servers/remote/install-ssh', { id });
}
