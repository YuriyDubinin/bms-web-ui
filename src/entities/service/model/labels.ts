import type { ChipTone } from '@shared/ui';
import { SERVICE_STATUSES, type ServiceStatus } from './types';

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ARCHIVED: 'Archived',
};

export const SERVICE_STATUS_TONES: Record<ServiceStatus, ChipTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
};

export const SERVICE_STATUS_OPTIONS = SERVICE_STATUSES.map((s) => ({
  value: s,
  label: SERVICE_STATUS_LABELS[s],
}));

export function formatPrice(price: number | null, currency: string): string {
  if (price == null) return '—';
  return `${price.toLocaleString()} ${currency}`;
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
