import { api } from '@shared/api';
import type { ContainersSnapshot } from '../model';

export async function getContainers(signal?: AbortSignal): Promise<ContainersSnapshot> {
  const raw = await api.get<ContainersSnapshot>('/api/system/containers/list', { signal });
  // Бэкенд при available:false отдаёт пустой containers; на всякий случай нормализуем null'ы.
  const r = raw as unknown as ContainersSnapshot & {
    containers: ContainersSnapshot['containers'] | null;
    errors?: ContainersSnapshot['errors'] | null;
  };
  return {
    ...raw,
    containers: r.containers ?? [],
    errors: r.errors ?? [],
  };
}
