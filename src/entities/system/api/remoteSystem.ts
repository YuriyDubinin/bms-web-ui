import { api } from '@shared/api';
import type { RemoteSystemResult, RemoteSystemSnapshot } from '../model/remote';
import type {
  SystemDiskPartition,
  SystemNetAddress,
  SystemNetInterface,
  SystemNetIoCounter,
} from '../model/types';

/**
 * POST /api/servers/remote/system/main — диагностический снимок удалённого сервера.
 * Сетевые/auth-провалы приходят как 200 OK с connected:false (без system) — это
 * не HTTP-ошибка; интерпретируем по `connected` + `status` в UI.
 */
export async function getRemoteSystem(
  id: string,
  signal?: AbortSignal,
): Promise<RemoteSystemResult> {
  const raw = await api.post<RemoteSystemResult>(
    '/api/servers/remote/system/main',
    { id },
    { signal },
  );
  return raw.system ? { ...raw, system: normalizeSnapshot(raw.system) } : raw;
}

/**
 * Нормализация nullable-массивов — повторяет логику getSystem.ts для локального
 * /api/system/main, чтобы UI не падал, если бэк вернул null вместо [].
 */
function normalizeSnapshot(raw: RemoteSystemSnapshot): RemoteSystemSnapshot {
  type RawSnapshot = Omit<RemoteSystemSnapshot, 'cpu' | 'disks' | 'network' | 'errors'> & {
    cpu: Omit<RemoteSystemSnapshot['cpu'], 'per_core_usage_percent' | 'flags'> & {
      per_core_usage_percent: number[] | null;
      flags?: string[] | null;
    };
    disks: Omit<RemoteSystemSnapshot['disks'], 'partitions'> & {
      partitions: SystemDiskPartition[] | null;
    };
    network: Omit<RemoteSystemSnapshot['network'], 'interfaces' | 'io_counters'> & {
      interfaces:
        | (Omit<SystemNetInterface, 'flags' | 'addresses'> & {
            flags: string[] | null;
            addresses: SystemNetAddress[] | null;
          })[]
        | null;
      io_counters: SystemNetIoCounter[] | null;
    };
    errors?: RemoteSystemSnapshot['errors'] | null;
  };

  const r = raw as unknown as RawSnapshot;

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
