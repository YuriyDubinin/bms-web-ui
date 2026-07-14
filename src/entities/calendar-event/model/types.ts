import type { SortOrder } from '@shared/api';

export const CALENDAR_EVENT_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

export type CalendarEvent = {
  id: string;
  project_id: string | null;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  status: CalendarEventStatus;
  recurrence_rule?: string;
  timezone: string;
  created_by: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CalendarEventSortBy = 'starts_at' | 'created_at' | 'updated_at' | 'title' | 'status';

export type CalendarEventListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  status?: CalendarEventStatus;
  search?: string;
  /** RFC3339 — окно пересечения по времени. */
  from?: string;
  to?: string;
  sort_by?: CalendarEventSortBy;
  order?: SortOrder;
};

export type CreateCalendarEventInput = {
  project_id?: string;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  status?: CalendarEventStatus;
  recurrence_rule?: string;
  timezone?: string;
  attributes?: Record<string, unknown>;
};

export type UpdateCalendarEventInput = CreateCalendarEventInput & { id: string };

export type DeleteCalendarEventResponse = {
  id: string;
  deleted_at: string;
};

// ---- Attendees ----

export const ATTENDEE_RESPONSE_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'] as const;
export type AttendeeResponseStatus = (typeof ATTENDEE_RESPONSE_STATUSES)[number];

export type Attendee = {
  id: string;
  event_id: string;
  attendee_entity_id: string;
  response_status: AttendeeResponseStatus;
  created_at: string;
};

export type AddAttendeeInput = {
  event_id: string;
  attendee_entity_id: string;
  response_status?: AttendeeResponseStatus;
};

export type RemoveAttendeeInput = {
  event_id: string;
  attendee_entity_id: string;
};
