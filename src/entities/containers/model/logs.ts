/** Контракт POST /api/servers/remote/system/containers/logs. */

export type ContainerLogsRequest = {
  server_id: string;
  /** Имя или ID контейнера. 1–255, `[a-zA-Z0-9._-]`, первый — alnum. */
  container: string;
  /** N>0 — последние N строк; -1 — все; не задано → 10000. Макс 1_000_000. */
  tail?: number;
  /** `30m` / `2h` / `5d` / `42s` или RFC3339. */
  since?: string;
  /** Тот же формат, что у `since`. */
  until?: string;
  /** Добавлять ли префикс RFC3339 к каждой строке (--timestamps). */
  timestamps?: boolean;
  /** Возвращать ли stderr отдельным полем (по умолчанию true). */
  include_stderr?: boolean;
};

export type ContainerLogsData = {
  available: boolean;
  reason?: string;
  container: string;
  command: string;
  stdout: string;
  stderr?: string;
  bytes_stdout: number;
  bytes_stderr: number;
  truncated_stdout: boolean;
  truncated_stderr: boolean;
  collected_at: string;
  duration_ms: number;
};

/** Стандартная «удалённая» обёртка ответа. */
export type ContainerLogsResponse = {
  id: string;
  connected: boolean;
  method?: string;
  status: string;
  message: string;
  checked_at: string;
  logs?: ContainerLogsData;
};
