/** Контракт POST /api/servers/remote/deploy. */

export const DEPLOY_RESTART_POLICIES = ['no', 'on-failure', 'always', 'unless-stopped'] as const;
export type DeployRestartPolicy = (typeof DEPLOY_RESTART_POLICIES)[number];

export type DeployPort = {
  host: number;
  container: number;
};

export type DeployRequest = {
  server_id: string;
  registry_id: string;
  /** Имя репозитория (без тега). Регэксп бэка: `[a-z0-9._/-]`, 1–255. */
  image: string;
  /** Тег. Первый символ не `.` и не `-`, 1–128. */
  tag: string;
  /** Имя контейнера на хосте. Первый символ — alnum, 1–255. */
  container_name: string;
  /** Маппинги host→container. До 20 элементов, host-порты уникальны. */
  ports?: DeployPort[];
  restart_policy?: DeployRestartPolicy;
};

/** Стабильные имена шагов — порядок фиксирован. */
export const DEPLOY_STEP_ORDER = [
  'registry_login',
  'stop_existing',
  'remove_existing',
  'remove_image',
  'pull_image',
  'run_container',
  'verify_running',
] as const;

export type DeployStepName = (typeof DEPLOY_STEP_ORDER)[number];

export type DeployStepStatus = 'ok' | 'skipped' | 'failed' | 'not_run' | string;

/** Человекочитаемые подписи шагов (используется когда бэк не прислал title). */
export const DEPLOY_STEP_TITLES: Record<DeployStepName, string> = {
  registry_login: 'Логин в registry',
  stop_existing: 'Остановка существующих контейнеров',
  remove_existing: 'Удаление существующих контейнеров',
  remove_image: 'Удаление старого образа',
  pull_image: 'Загрузка нового образа',
  run_container: 'Запуск контейнера',
  verify_running: 'Проверка работоспособности',
};

export type DeployStep = {
  name: DeployStepName | string;
  title: string;
  status: DeployStepStatus;
  message: string;
  duration_ms?: number;
};

export type DeployResult = {
  /** Есть ли docker CLI на сервере. */
  available: boolean;
  reason?: string;
  /** true ⇔ все шаги ok/skipped (нет failed/not_run). */
  success: boolean;
  image_ref: string;
  container_name: string;
  /** sha256 ID запущенного контейнера, если run_container прошёл. */
  container_id?: string;
  steps: DeployStep[];
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
};

/** Конверт ответа: обёртка как у всех /remote/* + result при connected=true. */
export type DeployResponse = {
  id: string;
  connected: boolean;
  method?: string;
  status: string;
  message: string;
  checked_at: string;
  result?: DeployResult;
};

/**
 * «Опасное состояние»: старый контейнер уже снесён, а новый не поднялся.
 * Это downtime — UI должен это явно подсвечивать.
 */
export function isDeployDowntimeState(r: DeployResult | undefined): boolean {
  if (!r || r.success) return false;
  const removedOld = r.steps.find((s) => s.name === 'remove_existing')?.status === 'ok';
  const newRunning = r.steps.find((s) => s.name === 'verify_running')?.status === 'ok';
  return removedOld && !newRunning;
}
