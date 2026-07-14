import { useMemo, useState } from 'react';
import { CalendarDays, MapPin, Pencil, Plus, Tags, Trash2, Users as AttendeesIcon } from 'lucide-react';
import { Button, Card, Chip, ConfirmDialog, IconButton, Select, Tooltip, notify } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { useAllProjectsQuery } from '@entities/project';
import {
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_EVENT_STATUS_OPTIONS,
  CALENDAR_EVENT_STATUS_TONES,
  useCalendarEventsQuery,
  useDeleteCalendarEvent,
  type CalendarEvent,
  type CalendarEventListParams,
  type CalendarEventStatus,
} from '@entities/calendar-event';
import { AttendeesDialog, CalendarEventFormDialog } from '@features/manage-calendar-event';
import { EntityExtrasDialog } from '@widgets/entity-panels';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...CALENDAR_EVENT_STATUS_OPTIONS];

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function endOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayHeading(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTimeRange(e: CalendarEvent): string {
  if (e.all_day) return 'All day';
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${new Date(e.starts_at).toLocaleTimeString(undefined, opts)} – ${new Date(e.ends_at).toLocaleTimeString(undefined, opts)}`;
}

export function CalendarPage() {
  useDocumentTitle('Calendar');

  const [from, setFrom] = useState(() => startOfMonthIso().slice(0, 10));
  const [to, setTo] = useState(() => endOfMonthIso().slice(0, 10));
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<CalendarEventStatus | ''>('');

  const { data: projectsData } = useAllProjectsQuery();
  const projects = useMemo(() => projectsData?.items ?? [], [projectsData]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const projectFilterOptions = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const params: CalendarEventListParams = {
    page: 1,
    page_size: 200,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    project_id: projectId || undefined,
    status: status || undefined,
    sort_by: 'starts_at',
    order: 'asc',
  };

  const { data, isLoading } = useCalendarEventsQuery(params);
  const items = useMemo(() => data?.items ?? [], [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [attendeesFor, setAttendeesFor] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [extrasFor, setExtrasFor] = useState<CalendarEvent | null>(null);
  const deleteMut = useDeleteCalendarEvent();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: CalendarEvent) => {
    setEditing(e);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      notify.success('Event deleted', { description: deleting.title });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of items) {
      const key = dayKey(e.starts_at);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={'// scheduled events'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New event
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
          className="rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-sm text-fg-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <span className="text-fg-muted">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
          className="rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-sm text-fg-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <Select
          options={projectFilterOptions}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Filter by project"
          containerClassName="w-44"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value as CalendarEventStatus | '')}
          aria-label="Filter by status"
          containerClassName="w-40"
        />
      </div>

      {isLoading && items.length === 0 ? (
        <Card>
          <p className="py-16 text-center text-sm text-fg-secondary">Loading…</p>
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <CalendarDays size={22} aria-hidden className="text-fg-muted" />
            <p className="text-sm text-fg-secondary">No events in this range</p>
            <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
              New event
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([key, dayEvents]) => (
            <div key={key}>
              <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-fg-muted">
                {formatDayHeading(key)}
              </h3>
              <div className="flex flex-col gap-2">
                {dayEvents.map((e) => (
                  <Card key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                    <span className="w-36 shrink-0 font-mono text-xs text-fg-secondary">
                      {formatTimeRange(e)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-fg-primary">{e.title}</span>
                        <Chip tone={CALENDAR_EVENT_STATUS_TONES[e.status]} mono>
                          {CALENDAR_EVENT_STATUS_LABELS[e.status]}
                        </Chip>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
                        {e.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} aria-hidden />
                            {e.location}
                          </span>
                        ) : null}
                        {e.project_id ? <span>{projectById.get(e.project_id)?.name}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip content="Attendees">
                        <IconButton aria-label="Manage attendees" size="sm" onClick={() => setAttendeesFor(e)}>
                          <AttendeesIcon size={13} aria-hidden />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Tags & links">
                        <IconButton aria-label="Tags and links" size="sm" onClick={() => setExtrasFor(e)}>
                          <Tags size={13} aria-hidden />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Edit">
                        <IconButton aria-label="Edit event" size="sm" onClick={() => openEdit(e)}>
                          <Pencil size={13} aria-hidden />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <IconButton aria-label="Delete event" size="sm" onClick={() => setDeleting(e)}>
                          <Trash2 size={13} aria-hidden />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CalendarEventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} />
      <AttendeesDialog
        open={!!attendeesFor}
        onOpenChange={(open) => {
          if (!open) setAttendeesFor(null);
        }}
        event={attendeesFor}
      />

      <EntityExtrasDialog
        open={!!extrasFor}
        onOpenChange={(open) => {
          if (!open) setExtrasFor(null);
        }}
        title={extrasFor?.title ?? ''}
        entityType="CALENDAR_EVENT"
        entityId={extrasFor?.id ?? null}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete event?"
        description={deleting ? `"${deleting.title}" will be removed.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
