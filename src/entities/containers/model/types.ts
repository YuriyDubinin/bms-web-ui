/** Снимок Docker-контейнеров из GET /api/containers. */

export type ContainerState =
  | 'running'
  | 'exited'
  | 'paused'
  | 'created'
  | 'restarting'
  | 'dead'
  | string;

export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting' | '' | string;

export type ContainerPort = {
  ip: string;
  private_port: number;
  public_port: number;
  type: string;
};

export type ContainerMount = {
  type: string;
  name: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
};

export type ContainerNetwork = {
  name: string;
  ip_address: string;
  gateway: string;
  mac_address: string;
  network_id: string;
};

export type ContainerLimits = {
  /** 0 = без лимита. */
  memory_bytes: number;
  /** nano_cpus / 1e9 = число CPU. 0 = без лимита. */
  nano_cpus: number;
  cpu_shares: number;
};

export type ContainerInfo = {
  id: string;
  short_id: string;
  name: string;
  image: string;
  image_id: string;
  command: string;
  created_at: string;
  state: ContainerState;
  status: string;
  health: ContainerHealth;
  health_failing_streak: number;
  running: boolean;
  paused: boolean;
  restarting: boolean;
  dead: boolean;
  oom_killed: boolean;
  exit_code: number;
  pid: number;
  restart_count: number;
  started_at: string | null;
  finished_at: string | null;
  platform: string;
  log_path: string;
  restart_policy: string;
  network_mode: string;
  privileged: boolean;
  user: string;
  working_dir: string;
  entrypoint: string[] | null;
  cmd: string[] | null;
  env: string[] | null;
  labels: Record<string, string> | null;
  ports: ContainerPort[] | null;
  mounts: ContainerMount[] | null;
  networks: ContainerNetwork[] | null;
  limits: ContainerLimits;
  size_rw_bytes: number;
  size_root_fs_bytes: number;
};

export type ContainerEngine = {
  version: string;
  api_version: string;
  git_commit: string;
  go_version: string;
  name: string;
  id: string;
  operating_system: string;
  os_type: string;
  architecture: string;
  kernel_version: string;
  storage_driver: string;
  cgroup_version: string;
  memory_total_bytes: number;
  ncpu: number;
  containers_total: number;
  containers_running: number;
  containers_paused: number;
  containers_stopped: number;
  images_total: number;
};

export type ContainersSnapshot = {
  available: boolean;
  /** Причина недоступности — только при available: false. */
  reason?: string;
  collected_at: string;
  engine: ContainerEngine | null;
  count: number;
  containers: ContainerInfo[];
  errors?: string[];
};

/** Один Docker-образ. */
export type ImageInfo = {
  /** Полный sha256, формат "sha256:<hex>". */
  id: string;
  /** Первые 12 hex после sha256: для UI. */
  short_id: string;
  parent_id?: string;
  /** Теги вида `nginx:1.27`. Пустой массив или отсутствует → образ висячий. */
  repo_tags?: string[];
  /** Манифест-дайджесты вида `nginx@sha256:...`. */
  repo_digests?: string[];
  created: string;
  size_bytes: number;
  /** Байт, общих со слоями других образов. Для remote всегда 0/отсутствует. */
  shared_size?: number;
  labels?: Record<string, string>;
  /** Сколько контейнеров используют этот образ (включая остановленные). */
  containers: number;
  /** true, если у образа нет тегов (только digest/ID). */
  dangling: boolean;
};

export type ImagesSnapshot = {
  available: boolean;
  reason?: string;
  collected_at: string;
  engine: ContainerEngine | null;
  count: number;
  images: ImageInfo[];
  errors?: string[];
};
