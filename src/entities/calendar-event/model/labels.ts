import type { ChipTone } from '@shared/ui';
import {
  ATTENDEE_RESPONSE_STATUSES,
  CALENDAR_EVENT_STATUSES,
  type AttendeeResponseStatus,
  type CalendarEventStatus,
} from './types';

export const CALENDAR_EVENT_STATUS_LABELS: Record<CalendarEventStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const CALENDAR_EVENT_STATUS_TONES: Record<CalendarEventStatus, ChipTone> = {
  SCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export const CALENDAR_EVENT_STATUS_OPTIONS = CALENDAR_EVENT_STATUSES.map((s) => ({
  value: s,
  label: CALENDAR_EVENT_STATUS_LABELS[s],
}));

export const ATTENDEE_RESPONSE_LABELS: Record<AttendeeResponseStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  TENTATIVE: 'Tentative',
};

export const ATTENDEE_RESPONSE_TONES: Record<AttendeeResponseStatus, ChipTone> = {
  PENDING: 'neutral',
  ACCEPTED: 'success',
  DECLINED: 'error',
  TENTATIVE: 'warning',
};

export const ATTENDEE_RESPONSE_OPTIONS = ATTENDEE_RESPONSE_STATUSES.map((s) => ({
  value: s,
  label: ATTENDEE_RESPONSE_LABELS[s],
}));
