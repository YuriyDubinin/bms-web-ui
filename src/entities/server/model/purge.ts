/** Контракт POST /api/servers/remote/images/purge. */

import type { DeployStep, DeployStepStatus } from './deploy';

export type PurgeRequest = {
  server_id: string;
  registry_id: string;
  /** Имя репозитория без namespace и тега. `[a-z0-9._/-]`, 1–255. */
  image: string;
  /** Версия. Первый символ не `.` и не `-`, 1–128. */
  tag: string;
  /** Точное имя контейнера. Опционально — если пусто, поиск только по образу. */
  container_name?: string;
};

/** Стабильные имена шагов purge — порядок фиксирован (всегда 5). */
export const PURGE_STEP_ORDER = [
  'find_containers',
  'stop_containers',
  'remove_containers',
  'remove_image',
  'verify_purged',
] as const;

export type PurgeStepName = (typeof PURGE_STEP_ORDER)[number];

/** Человекочитаемые подписи шагов (fallback, если бэк не прислал title). */
export const PURGE_STEP_TITLES: Record<PurgeStepName, string> = {
  find_containers: 'Поиск контейнеров',
  stop_containers: 'Остановка контейнеров',
  remove_containers: 'Удаление контейнеров',
  remove_image: 'Удаление образа',
  verify_purged: 'Проверка очистки',
};

/** Структура шага совпадает с deploy. */
export type PurgeStep = DeployStep;
export type PurgeStepStatus = DeployStepStatus;

export type PurgeResult = {
  /** Есть ли docker CLI на сервере. */
  available: boolean;
  reason?: string;
  /** true ⇔ все шаги ok/skipped (нет failed/not_run). */
  success: boolean;
  image_ref: string;
  container_name?: string;
  steps: PurgeStep[];
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
};

/** Конверт ответа: обёртка как у всех /remote/* + result при connected=true. */
export type PurgeResponse = {
  id: string;
  connected: boolean;
  method?: string;
  status: string;
  message: string;
  checked_at: string;
  result?: PurgeResult;
};
