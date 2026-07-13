import { api } from '@shared/api';
import type {
  CreateRegistryInput,
  DeleteRegistryResponse,
  Registry,
  RegistryConnectResult,
  RegistryImagesInput,
  RegistryImagesResponse,
  RegistryListParams,
  RegistryListResponse,
  RegistryPingResult,
  UpdateRegistryInput,
} from '../model';

function buildQuery(params: RegistryListParams): string {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.page_size != null) qs.set('page_size', String(params.page_size));
  if (params.type) qs.set('type', params.type);
  if (params.is_active != null) qs.set('is_active', String(params.is_active));
  if (params.is_default != null) qs.set('is_default', String(params.is_default));
  if (params.search) qs.set('search', params.search);
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.order) qs.set('order', params.order);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function listRegistries(
  params: RegistryListParams,
  signal?: AbortSignal,
): Promise<RegistryListResponse> {
  return api.get<RegistryListResponse>(`/api/registries/list${buildQuery(params)}`, { signal });
}

export function createRegistry(input: CreateRegistryInput): Promise<Registry> {
  return api.post<Registry>('/api/registries/create', input);
}

export function updateRegistry(input: UpdateRegistryInput): Promise<Registry> {
  return api.put<Registry>('/api/registries/update', input);
}

export function deleteRegistry(id: string): Promise<DeleteRegistryResponse> {
  return api.delete<DeleteRegistryResponse>('/api/registries/delete', { id });
}

/** connect — логин по сохранённым email+password; при успехе включает запись (is_active=true). */
export function connectRegistry(id: string): Promise<RegistryConnectResult> {
  return api.post<RegistryConnectResult>('/api/registries/connect', { id });
}

/** ping — health-check сохранённой записи; переключает is_active в обе стороны. */
export function pingRegistry(id: string): Promise<RegistryPingResult> {
  return api.post<RegistryPingResult>('/api/registries/ping', { id });
}

/** Список образов namespace'а по сохранённой записи. */
export async function getRegistryImages(
  input: RegistryImagesInput,
  signal?: AbortSignal,
): Promise<RegistryImagesResponse> {
  const raw = await api.post<RegistryImagesResponse>('/api/registries/images', input, { signal });
  // На всякий случай нормализуем возможный null в images.
  const r = raw as unknown as RegistryImagesResponse & { images: RegistryImagesResponse['images'] | null };
  return { ...raw, images: r.images ?? [] };
}
