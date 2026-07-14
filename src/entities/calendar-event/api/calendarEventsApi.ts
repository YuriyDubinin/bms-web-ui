import { api, buildQuery, type ListResponse } from '@shared/api';
import type {
  AddAttendeeInput,
  Attendee,
  CalendarEvent,
  CalendarEventListParams,
  CreateCalendarEventInput,
  DeleteCalendarEventResponse,
  RemoveAttendeeInput,
  UpdateCalendarEventInput,
} from '../model';

export function listCalendarEvents(
  params: CalendarEventListParams,
  signal?: AbortSignal,
): Promise<ListResponse<CalendarEvent>> {
  return api.get<ListResponse<CalendarEvent>>(`/api/calendar-events/list${buildQuery(params)}`, { signal });
}

export function createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
  return api.post<CalendarEvent>('/api/calendar-events/create', input);
}

export function updateCalendarEvent(input: UpdateCalendarEventInput): Promise<CalendarEvent> {
  return api.put<CalendarEvent>('/api/calendar-events/update', input);
}

export function deleteCalendarEvent(id: string): Promise<DeleteCalendarEventResponse> {
  return api.delete<DeleteCalendarEventResponse>('/api/calendar-events/delete', { id });
}

export function addAttendee(input: AddAttendeeInput): Promise<Attendee> {
  return api.post<Attendee>('/api/calendar-events/attendees/add', input);
}

export function removeAttendee(input: RemoveAttendeeInput): Promise<{ status: 'REMOVED' }> {
  return api.delete<{ status: 'REMOVED' }>('/api/calendar-events/attendees/remove', input);
}

export function listAttendees(eventId: string, signal?: AbortSignal): Promise<{ items: Attendee[] }> {
  return api.get<{ items: Attendee[] }>(
    `/api/calendar-events/attendees/list${buildQuery({ event_id: eventId })}`,
    { signal },
  );
}
