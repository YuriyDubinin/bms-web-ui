import { useMemo, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { ApiError, isExistsError } from '@shared/api';
import { Button, Chip, Dialog, IconButton, Select, Spinner, Tooltip, notify } from '@shared/ui';
import { useAllClientsQuery } from '@entities/client';
import { useAllUsersQuery } from '@entities/user';
import {
  ATTENDEE_RESPONSE_LABELS,
  ATTENDEE_RESPONSE_TONES,
  useAddAttendee,
  useAttendeesQuery,
  useRemoveAttendee,
  type CalendarEvent,
} from '@entities/calendar-event';

export type AttendeesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
};

type AttendeeKind = 'user' | 'client';

export function AttendeesDialog({ open, onOpenChange, event }: AttendeesDialogProps) {
  const eventId = event?.id ?? null;
  const { data, isLoading } = useAttendeesQuery(eventId);
  const { data: usersData } = useAllUsersQuery();
  const { data: clientsData } = useAllClientsQuery();
  const addMut = useAddAttendee();
  const removeMut = useRemoveAttendee();

  const [kind, setKind] = useState<AttendeeKind>('user');
  const [entityId, setEntityId] = useState('');

  const users = useMemo(() => usersData?.items ?? [], [usersData]);
  const clients = useMemo(() => clientsData?.items ?? [], [clientsData]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.id, u.full_name);
    for (const c of clients) map.set(c.id, c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed client');
    return map;
  }, [users, clients]);

  const entityOptions = (kind === 'user' ? users.map((u) => ({ value: u.id, label: u.full_name })) : clients.map((c) => ({
    value: c.id,
    label: c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed client',
  })));

  const attendees = data?.items ?? [];

  const handleAdd = async () => {
    if (!eventId || !entityId) return;
    try {
      await addMut.mutateAsync({ event_id: eventId, attendee_entity_id: entityId });
      setEntityId('');
      notify.success('Attendee added');
    } catch (err) {
      if (err instanceof ApiError && isExistsError(err.code)) {
        notify.error('Already invited');
        return;
      }
      notify.error(err instanceof Error ? err.message : 'Could not add attendee');
    }
  };

  const handleRemove = async (attendeeEntityId: string) => {
    if (!eventId) return;
    try {
      await removeMut.mutateAsync({ event_id: eventId, attendee_entity_id: attendeeEntityId });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not remove attendee');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Attendees"
      description={event?.title}
      className="w-[min(94vw,480px)]"
    >
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex items-end gap-2">
          <Select
            label="Type"
            options={[
              { value: 'user', label: 'Team member' },
              { value: 'client', label: 'Client' },
            ]}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as AttendeeKind);
              setEntityId('');
            }}
            containerClassName="w-36"
          />
          <Select
            label="Person"
            placeholder="Select…"
            options={entityOptions}
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            containerClassName="flex-1"
          />
          <Button
            leftIcon={<UserPlus size={14} aria-hidden />}
            disabled={!entityId || addMut.isPending}
            loading={addMut.isPending}
            onClick={handleAdd}
          >
            Add
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size={16} label="Loading attendees" />
            </div>
          ) : attendees.length === 0 ? (
            <p className="py-4 text-center text-xs text-fg-muted">No attendees yet</p>
          ) : (
            attendees.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-2"
              >
                <span className="truncate text-sm text-fg-primary">
                  {nameById.get(a.attendee_entity_id) ?? a.attendee_entity_id}
                </span>
                <div className="flex items-center gap-2">
                  <Chip tone={ATTENDEE_RESPONSE_TONES[a.response_status]} mono>
                    {ATTENDEE_RESPONSE_LABELS[a.response_status]}
                  </Chip>
                  <Tooltip content="Remove">
                    <IconButton
                      aria-label="Remove attendee"
                      size="sm"
                      onClick={() => handleRemove(a.attendee_entity_id)}
                    >
                      <Trash2 size={13} aria-hidden />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
