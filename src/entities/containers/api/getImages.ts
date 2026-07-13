import { api } from '@shared/api';
import type { ImagesSnapshot } from '../model';

/** GET /api/system/images/list — Docker-образы на машине, где работает API. */
export async function getImages(signal?: AbortSignal): Promise<ImagesSnapshot> {
  const raw = await api.get<ImagesSnapshot>('/api/system/images/list', { signal });
  // На available:false бэк отдаёт пустой images; нормализуем возможные null'ы.
  const r = raw as unknown as ImagesSnapshot & {
    images: ImagesSnapshot['images'] | null;
    errors?: ImagesSnapshot['errors'] | null;
  };
  return {
    ...raw,
    images: r.images ?? [],
    errors: r.errors ?? [],
  };
}
