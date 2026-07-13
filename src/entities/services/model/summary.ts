import type { ServicesSnapshot } from './types';

export type ServiceStateSummary = {
  total: number;
  active: number;
  activating: number;
  deactivating: number;
  failed: number;
  /** inactive + всё неизвестное. */
  inactive: number;
};

export function summarizeServices(snap: ServicesSnapshot): ServiceStateSummary {
  let active = 0;
  let activating = 0;
  let deactivating = 0;
  let failed = 0;
  let inactive = 0;

  for (const s of snap.services) {
    switch (s.active_state) {
      case 'active':
        active += 1;
        break;
      case 'activating':
        activating += 1;
        break;
      case 'deactivating':
        deactivating += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      default:
        inactive += 1;
    }
  }

  return {
    total: snap.count || snap.services.length,
    active,
    activating,
    deactivating,
    failed,
    inactive,
  };
}

/** Суммарная RAM по сервисам, у которых учёт включён (значение >= 0). */
export function servicesTotalMemoryBytes(snap: ServicesSnapshot): number {
  return snap.services.reduce(
    (acc, s) => acc + (s.memory_current_bytes > 0 ? s.memory_current_bytes : 0),
    0,
  );
}

/** Накопительное CPU-время по сервисам (нс). Используется для расчёта дельты-нагрузки. */
export function servicesTotalCpuNsec(snap: ServicesSnapshot): number {
  return snap.services.reduce((acc, s) => acc + (s.cpu_usage_nsec > 0 ? s.cpu_usage_nsec : 0), 0);
}

/** Суммарное число задач (процессов/потоков) по сервисам с включённым учётом. */
export function servicesTotalTasks(snap: ServicesSnapshot): number {
  return snap.services.reduce((acc, s) => acc + (s.tasks_current > 0 ? s.tasks_current : 0), 0);
}

export function servicesEnabledCount(snap: ServicesSnapshot): number {
  return snap.services.reduce((acc, s) => acc + (s.enabled ? 1 : 0), 0);
}

/** Есть ли хоть один сервис с включённым учётом памяти (иначе сумму показывать нечем). */
export function hasMemoryAccounting(snap: ServicesSnapshot): boolean {
  return snap.services.some((s) => s.memory_current_bytes >= 0);
}
