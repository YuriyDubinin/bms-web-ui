/** Снимок systemd-сервисов из GET /api/services. */

export type ServiceActiveState =
  | 'active'
  | 'inactive'
  | 'failed'
  | 'activating'
  | 'deactivating'
  | string;

export type ServiceInfo = {
  name: string;
  description: string;
  load_state: string;
  active_state: ServiceActiveState;
  sub_state: string;
  unit_file_state: string;
  type: string;
  enabled: boolean;
  main_pid: number;
  /** -1 = учёт выключен (cgroup accounting off). */
  memory_current_bytes: number;
  memory_peak_bytes: number;
  /** Накопительное CPU-время, нс. -1 = недоступно. */
  cpu_usage_nsec: number;
  /** -1 = недоступно. */
  tasks_current: number;
  /** -1 = без лимита (infinity). */
  tasks_max: number;
  n_restarts: number;
  result: string;
  active_enter_at: string | null;
  exec_main_start_at: string | null;
  uptime_seconds: number;
  fragment_path: string;
  user: string;
  group: string;
};

export type ServicesManager = {
  version: string;
  architecture: string;
  failed_units: number;
  total_names: number;
};

export type ServicesSnapshot = {
  available: boolean;
  /** Причина недоступности — только при available: false. */
  reason?: string;
  collected_at: string;
  manager: ServicesManager | null;
  count: number;
  services: ServiceInfo[];
  errors?: string[];
};
