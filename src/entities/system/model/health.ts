import type { SystemSnapshot } from './types';

export type HealthStatus = 'ok' | 'degraded' | 'down';

export type Health = {
  status: HealthStatus;
  reasons: string[];
};

/**
 * Агрегатный health системы. DB unreachable — сразу `down`.
 * Любой превышенный порог по памяти/диску/swap/load — `degraded`.
 */
export function deriveHealth(s: SystemSnapshot): Health {
  if (!s.database.reachable) {
    return { status: 'down', reasons: ['database unreachable'] };
  }
  const reasons: string[] = [];
  if (s.memory.virtual.used_percent >= 95) {
    reasons.push(`RAM ${s.memory.virtual.used_percent.toFixed(0)}%`);
  }
  const root = s.disks.partitions.find((p) => p.mountpoint === '/') ?? s.disks.partitions[0];
  if (root && root.used_percent >= 95) {
    reasons.push(`disk ${root.mountpoint} ${root.used_percent.toFixed(0)}%`);
  }
  if (s.memory.swap.total_bytes > 0 && s.memory.swap.used_percent >= 50) {
    reasons.push(`swap ${s.memory.swap.used_percent.toFixed(0)}%`);
  }
  if (s.cpu.logical_cores > 0 && s.cpu.load_avg_1 > s.cpu.logical_cores * 2) {
    reasons.push('load > 2× cores');
  }
  return { status: reasons.length ? 'degraded' : 'ok', reasons };
}

/** Цвет/тон для агрегатного пилла. */
export function healthTone(status: HealthStatus): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'ok':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'down':
      return 'error';
  }
}

export function healthLabel(status: HealthStatus): string {
  switch (status) {
    case 'ok':
      return 'OPERATIONAL';
    case 'degraded':
      return 'DEGRADED';
    case 'down':
      return 'DOWN';
  }
}
