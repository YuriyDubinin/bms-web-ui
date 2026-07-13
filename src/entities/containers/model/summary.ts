import type { ContainersSnapshot } from './types';

export type ContainerStateSummary = {
  total: number;
  running: number;
  paused: number;
  restarting: number;
  /** exited / dead / created — всё, что не работает и не на паузе/рестарте. */
  stopped: number;
};

/**
 * Сводка по состояниям. Считаем по списку контейнеров (он содержит все),
 * порядок проверок важен: restarting → paused → running → иначе stopped.
 * Total берём из count (авторитетное число с бэка).
 */
export function summarizeContainers(snap: ContainersSnapshot): ContainerStateSummary {
  let running = 0;
  let paused = 0;
  let restarting = 0;
  let stopped = 0;

  for (const c of snap.containers) {
    if (c.restarting) restarting += 1;
    else if (c.paused) paused += 1;
    else if (c.running) running += 1;
    else stopped += 1;
  }

  const total = snap.count || snap.containers.length;
  return { total, running, paused, restarting, stopped };
}

/** Суммарный footprint = размер root-fs всех контейнеров (байты). */
export function containersFootprintBytes(snap: ContainersSnapshot): number {
  return snap.containers.reduce((acc, c) => acc + (c.size_root_fs_bytes || 0), 0);
}
