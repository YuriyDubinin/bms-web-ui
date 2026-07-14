import type { ChipTone } from '@shared/ui';
import { PROJECT_STATUSES, type ProjectStatus } from './types';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  ARCHIVED: 'Archived',
};

export const PROJECT_STATUS_TONES: Record<ProjectStatus, ChipTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  ARCHIVED: 'neutral',
};

export const PROJECT_STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({
  value: s,
  label: PROJECT_STATUS_LABELS[s],
}));
