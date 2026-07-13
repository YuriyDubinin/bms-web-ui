import type {
  SystemCpu,
  SystemDisks,
  SystemDocker,
  SystemError,
  SystemHost,
  SystemMemory,
  SystemNetwork,
} from './types';

/** Параметры успешного коннекта к удалённому серверу — приходят только в remote-ответе. */
export type RemoteSystemConnection = {
  host: string;
  port: number;
  user: string;
  /** publickey | password */
  method: string;
  /** RTT SSH-handshake'а, мс. */
  latency_ms: number;
};

/**
 * Снимок состояния удалённого сервера. По форме совпадает с локальным SystemSnapshot
 * минус app/process/database (на удалённой машине у нас этого понятия нет), плюс
 * connection (как мы туда вошли).
 */
export type RemoteSystemSnapshot = {
  collected_at: string;
  collection_duration_ms: number;
  connection: RemoteSystemConnection;
  host: SystemHost;
  cpu: SystemCpu;
  memory: SystemMemory;
  disks: SystemDisks;
  network: SystemNetwork;
  /** Может быть `{}` или отсутствовать, если на сервере нет docker. */
  docker?: SystemDocker;
  /** Секции, которые не удалось собрать — рендерим иконку-предупреждение. */
  errors?: SystemError[];
};

/**
 * Конверт ответа POST /api/servers/remote/system/main. Сетевые/auth-провалы — это
 * 200 OK с `connected:false` и пустым `system` (читаем по `connected`/`status`).
 */
export type RemoteSystemResult = {
  id: string;
  connected: boolean;
  method?: string;
  status: string;
  message: string;
  checked_at: string;
  system?: RemoteSystemSnapshot;
};
