import { api } from '@shared/api';
import type { ServicesSnapshot } from '../model';

export async function getServices(signal?: AbortSignal): Promise<ServicesSnapshot> {
  const raw = await api.get<ServicesSnapshot>('/api/system/services/list', { signal });
  // При available:false бэкенд отдаёт пустой services; нормализуем возможные null'ы.
  const r = raw as unknown as ServicesSnapshot & {
    services: ServicesSnapshot['services'] | null;
    errors?: ServicesSnapshot['errors'] | null;
  };
  return {
    ...raw,
    services: r.services ?? [],
    errors: r.errors ?? [],
  };
}
