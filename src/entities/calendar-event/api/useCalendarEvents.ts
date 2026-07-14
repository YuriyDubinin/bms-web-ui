import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
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
import {
  addAttendee,
  createCalendarEvent,
  deleteCalendarEvent,
  listAttendees,
  listCalendarEvents,
  removeAttendee,
  updateCalendarEvent,
} from './calendarEventsApi';

export const CALENDAR_EVENTS_QUERY_KEY = ['calendar-events'] as const;
export const ATTENDEES_QUERY_KEY = ['calendar-event-attendees'] as const;

export function useCalendarEventsQuery(
  params: CalendarEventListParams,
): UseQueryResult<ListResponse<CalendarEvent>, Error> {
  return useQuery<ListResponse<CalendarEvent>, Error>({
    queryKey: [...CALENDAR_EVENTS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listCalendarEvents(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateCalendarEvent(): UseMutationResult<CalendarEvent, Error, CreateCalendarEventInput> {
  const qc = useQueryClient();
  return useMutation<CalendarEvent, Error, CreateCalendarEventInput>({
    mutationFn: createCalendarEvent,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
    },
  });
}

export function useUpdateCalendarEvent(): UseMutationResult<CalendarEvent, Error, UpdateCalendarEventInput> {
  const qc = useQueryClient();
  return useMutation<CalendarEvent, Error, UpdateCalendarEventInput>({
    mutationFn: updateCalendarEvent,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
    },
  });
}

export function useDeleteCalendarEvent(): UseMutationResult<DeleteCalendarEventResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteCalendarEventResponse, Error, string>({
    mutationFn: deleteCalendarEvent,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
    },
  });
}

export function useAttendeesQuery(eventId: string | null): UseQueryResult<{ items: Attendee[] }, Error> {
  return useQuery<{ items: Attendee[] }, Error>({
    queryKey: [...ATTENDEES_QUERY_KEY, eventId],
    queryFn: ({ signal }) => listAttendees(eventId as string, signal),
    enabled: !!eventId,
    staleTime: 10_000,
  });
}

export function useAddAttendee(): UseMutationResult<Attendee, Error, AddAttendeeInput> {
  const qc = useQueryClient();
  return useMutation<Attendee, Error, AddAttendeeInput>({
    mutationFn: addAttendee,
    meta: { silent: true },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...ATTENDEES_QUERY_KEY, vars.event_id] });
    },
  });
}

export function useRemoveAttendee(): UseMutationResult<{ status: 'REMOVED' }, Error, RemoveAttendeeInput> {
  const qc = useQueryClient();
  return useMutation<{ status: 'REMOVED' }, Error, RemoveAttendeeInput>({
    mutationFn: removeAttendee,
    meta: { silent: true },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...ATTENDEES_QUERY_KEY, vars.event_id] });
    },
  });
}
