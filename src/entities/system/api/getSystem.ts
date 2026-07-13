import { api } from '@shared/api';
import type {
  SystemDiskPartition,
  SystemNetAddress,
  SystemNetInterface,
  SystemNetIoCounter,
  SystemSnapshot,
} from '../model';

export async function getSystem(signal?: AbortSignal): Promise<SystemSnapshot> {
  const raw = await api.get<SystemSnapshot>('/api/system/main', { signal });
  return normalizeSnapshot(raw);
}

/**
 * Бэкенд может вернуть `null` вместо массива для секций, которые не удалось собрать
 * (см. поле `errors[]` в ответе). Чтобы UI не падал на каждой итерации, заменяем
 * nullable-массивы на пустые здесь, на границе API. Внутри страниц массивы
 * считаются всегда определёнными.
 */
function normalizeSnapshot(raw: SystemSnapshot): SystemSnapshot {
  // Расширенный «сырой» взгляд на снапшот: те же поля, но с допустимыми null'ами.
  type Raw = Omit<SystemSnapshot, 'cpu' | 'disks' | 'network' | 'errors'> & {
    cpu: Omit<SystemSnapshot['cpu'], 'per_core_usage_percent' | 'flags'> & {
      per_core_usage_percent: number[] | null;
      flags?: string[] | null;
    };
    disks: Omit<SystemSnapshot['disks'], 'partitions'> & {
      partitions: SystemDiskPartition[] | null;
    };
    network: Omit<SystemSnapshot['network'], 'interfaces' | 'io_counters'> & {
      interfaces:
        | (Omit<SystemNetInterface, 'flags' | 'addresses'> & {
            flags: string[] | null;
            addresses: SystemNetAddress[] | null;
          })[]
        | null;
      io_counters: SystemNetIoCounter[] | null;
    };
    errors: SystemSnapshot['errors'] | null;
  };

  const r = raw as unknown as Raw;

  return {
    ...raw,
    cpu: {
      ...raw.cpu,
      per_core_usage_percent: r.cpu.per_core_usage_percent ?? [],
      flags: r.cpu.flags ?? undefined,
    },
    disks: {
      ...raw.disks,
      partitions: r.disks.partitions ?? [],
    },
    network: {
      ...raw.network,
      interfaces: (r.network.interfaces ?? []).map((iface) => ({
        ...iface,
        flags: iface.flags ?? [],
        addresses: iface.addresses ?? [],
      })),
      io_counters: r.network.io_counters ?? [],
    },
    errors: r.errors ?? [],
  };
}
