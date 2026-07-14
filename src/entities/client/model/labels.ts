import type { ChipTone } from '@shared/ui';
import { CLIENT_STATUSES, type Client, type ClientStatus } from './types';

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  LEAD: 'Lead',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ARCHIVED: 'Archived',
};

export const CLIENT_STATUS_TONES: Record<ClientStatus, ChipTone> = {
  LEAD: 'info',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
};

export const CLIENT_STATUS_OPTIONS = CLIENT_STATUSES.map((s) => ({
  value: s,
  label: CLIENT_STATUS_LABELS[s],
}));

/** company_name → "first last" → "Unnamed client". Клиент гарантированно имеет хотя бы одно из полей. */
export function clientDisplayName(c: Pick<Client, 'first_name' | 'last_name' | 'company_name'>): string {
  if (c.company_name) return c.company_name;
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return full || 'Unnamed client';
}

export function clientInitials(c: Pick<Client, 'first_name' | 'last_name' | 'company_name'>): string {
  const name = clientDisplayName(c);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
