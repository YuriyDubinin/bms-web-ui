const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
const KIB = 1024;

/** Авто-масштабированные байты в KiB/MiB/... (база 1024). */
export function formatBytes(bytes: number | undefined | null, precision = 1): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const sign = bytes < 0 ? '-' : '';
  let n = Math.abs(bytes);
  let unitIdx = 0;
  while (n >= KIB && unitIdx < BYTE_UNITS.length - 1) {
    n /= KIB;
    unitIdx += 1;
  }
  const value = unitIdx === 0 ? n.toFixed(0) : n.toFixed(precision);
  return `${sign}${value} ${BYTE_UNITS[unitIdx]}`;
}

export function formatBytesPerSecond(bps: number | undefined | null): string {
  if (bps == null || !Number.isFinite(bps)) return '—';
  return `${formatBytes(bps, 1)}/s`;
}

/** Превращает секунды в "2d 14h 32m", "12m 4s", "8s". */
export function formatUptime(totalSeconds: number | undefined | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  if (!days && !hours) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function formatPercent(p: number | undefined | null, precision = 1): string {
  if (p == null || !Number.isFinite(p)) return '—';
  return `${p.toFixed(precision)}%`;
}

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullFmt = new Intl.NumberFormat('en-US');

export function formatCount(n: number | undefined | null, compact = false): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return compact && Math.abs(n) >= 10_000 ? compactFmt.format(n) : fullFmt.format(n);
}

export function formatMs(ms: number | undefined | null, precision = 2): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return `${ms.toFixed(precision)} ms`;
}

/** Наносекунды → миллисекунды строкой. */
export function formatNs(ns: number | undefined | null, precision = 2): string {
  if (ns == null || !Number.isFinite(ns)) return '—';
  return `${(ns / 1_000_000).toFixed(precision)} ms`;
}

/** Mhz → "2.4 GHz" / "850 MHz". */
export function formatMhz(mhz: number | undefined | null): string {
  if (mhz == null || !Number.isFinite(mhz) || mhz <= 0) return '—';
  if (mhz >= 1000) return `${(mhz / 1000).toFixed(2)} GHz`;
  return `${mhz.toFixed(0)} MHz`;
}

/** ISO → "2026-05-26 14:32:00 UTC". */
export function formatIsoUtc(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  );
}

export function shortSha(sha: string | undefined | null, length = 7): string {
  if (!sha) return '—';
  return sha.slice(0, length);
}

/**
 * ISO → относительное время вида "3d ago" / "2h ago" / "12m ago" / "just now".
 * Возвращает прочерк для пустых/невалидных значений.
 */
export function formatRelative(iso: string | undefined | null, now: Date = new Date()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return 'in the future';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}
