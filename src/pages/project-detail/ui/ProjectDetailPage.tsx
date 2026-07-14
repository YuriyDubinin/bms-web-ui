import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Chip, ConfirmDialog, FullScreenSpinner, IconButton, Tooltip, notify } from '@shared/ui';
import { cn } from '@shared/lib';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { TagPicker, LinkedEntitiesPanel, DynamicFieldsForm } from '@widgets/entity-panels';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  useDeleteProject,
  useProjectsQuery,
} from '@entities/project';
import { ProjectFormDialog } from '@features/manage-project';
import {
  formatDuration,
  formatPrice,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_TONES,
  useServicesQuery,
  useDeleteService,
  type Service,
} from '@entities/service';
import { ServiceFormDialog } from '@features/manage-service';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONES,
  clientDisplayName,
  useClientsQuery,
  useDeleteClient,
  type Client,
} from '@entities/client';
import { ClientFormDialog } from '@features/manage-client';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  useTasksQuery,
  useDeleteTask,
  type Task,
} from '@entities/task';
import { TaskFormDialog } from '@features/manage-task';
import {
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_EVENT_STATUS_TONES,
  useCalendarEventsQuery,
  useDeleteCalendarEvent,
  type CalendarEvent,
} from '@entities/calendar-event';
import { CalendarEventFormDialog } from '@features/manage-calendar-event';

const TABS = ['overview', 'services', 'clients', 'tasks', 'calendar'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  services: 'Services',
  clients: 'Clients',
  tasks: 'Tasks',
  calendar: 'Calendar',
};

// У projects/list нет фильтра по id — сущность ищем в достаточно широком списке организации.
const LOOKUP_PARAMS = { page: 1, page_size: 100 } as const;

function ServicesTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useServicesQuery({ project_id: projectId, page_size: 50 });
  const deleteMut = useDeleteService();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const items = data?.items ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-primary">Services</h3>
        <Button
          size="sm"
          leftIcon={<Plus size={13} aria-hidden />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add service
        </Button>
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-xs text-fg-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-fg-muted">No services linked to this project</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {items.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <span className="truncate text-sm text-fg-primary">{s.name}</span>
                <div className="font-mono text-[11px] text-fg-muted">
                  {formatPrice(s.price, s.currency)} · {formatDuration(s.duration_min)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={SERVICE_STATUS_TONES[s.status]} mono>
                  {SERVICE_STATUS_LABELS[s.status]}
                </Chip>
                <IconButton
                  aria-label="Edit service"
                  size="sm"
                  onClick={() => {
                    setEditing(s);
                    setFormOpen(true);
                  }}
                >
                  <Pencil size={13} aria-hidden />
                </IconButton>
                <IconButton aria-label="Delete service" size="sm" onClick={() => setDeleting(s)}>
                  <Trash2 size={13} aria-hidden />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editing} defaultProjectId={projectId} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete service?"
        description={deleting ? `"${deleting.name}" will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await deleteMut.mutateAsync(deleting.id);
          notify.success('Service deleted');
          setDeleting(null);
        }}
      />
    </Card>
  );
}

function ClientsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useClientsQuery({ project_id: projectId, page_size: 50 });
  const deleteMut = useDeleteClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const items = data?.items ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-primary">Clients</h3>
        <Button
          size="sm"
          leftIcon={<Plus size={13} aria-hidden />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add client
        </Button>
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-xs text-fg-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-fg-muted">No clients linked to this project</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <span className="truncate text-sm text-fg-primary">{clientDisplayName(c)}</span>
                <div className="font-mono text-[11px] text-fg-muted">{c.email || c.phone || '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={CLIENT_STATUS_TONES[c.status]} mono>
                  {CLIENT_STATUS_LABELS[c.status]}
                </Chip>
                <IconButton
                  aria-label="Edit client"
                  size="sm"
                  onClick={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                >
                  <Pencil size={13} aria-hidden />
                </IconButton>
                <IconButton aria-label="Delete client" size="sm" onClick={() => setDeleting(c)}>
                  <Trash2 size={13} aria-hidden />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} defaultProjectId={projectId} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete client?"
        description={deleting ? `"${clientDisplayName(deleting)}" will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await deleteMut.mutateAsync(deleting.id);
          notify.success('Client deleted');
          setDeleting(null);
        }}
      />
    </Card>
  );
}

function TasksTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useTasksQuery({ project_id: projectId, page_size: 50, sort_by: 'due_at', order: 'asc' });
  const deleteMut = useDeleteTask();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const items = data?.items ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-primary">Tasks</h3>
        <Button
          size="sm"
          leftIcon={<Plus size={13} aria-hidden />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add task
        </Button>
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-xs text-fg-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-fg-muted">No tasks linked to this project</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <span className="truncate text-sm text-fg-primary">{t.title}</span>
                <div className="font-mono text-[11px] text-fg-muted">
                  {t.due_at ? new Date(t.due_at).toLocaleString() : 'No due date'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={TASK_STATUS_TONES[t.status]} mono>
                  {TASK_STATUS_LABELS[t.status]}
                </Chip>
                <IconButton
                  aria-label="Edit task"
                  size="sm"
                  onClick={() => {
                    setEditing(t);
                    setFormOpen(true);
                  }}
                >
                  <Pencil size={13} aria-hidden />
                </IconButton>
                <IconButton aria-label="Delete task" size="sm" onClick={() => setDeleting(t)}>
                  <Trash2 size={13} aria-hidden />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} defaultProjectId={projectId} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete task?"
        description={deleting ? `"${deleting.title}" will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await deleteMut.mutateAsync(deleting.id);
          notify.success('Task deleted');
          setDeleting(null);
        }}
      />
    </Card>
  );
}

function CalendarTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useCalendarEventsQuery({ project_id: projectId, page_size: 50, sort_by: 'starts_at', order: 'asc' });
  const deleteMut = useDeleteCalendarEvent();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const items = data?.items ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-primary">Calendar</h3>
        <Button
          size="sm"
          leftIcon={<Plus size={13} aria-hidden />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add event
        </Button>
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-xs text-fg-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-fg-muted">No events linked to this project</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {items.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <span className="truncate text-sm text-fg-primary">{e.title}</span>
                <div className="font-mono text-[11px] text-fg-muted">{new Date(e.starts_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={CALENDAR_EVENT_STATUS_TONES[e.status]} mono>
                  {CALENDAR_EVENT_STATUS_LABELS[e.status]}
                </Chip>
                <IconButton
                  aria-label="Edit event"
                  size="sm"
                  onClick={() => {
                    setEditing(e);
                    setFormOpen(true);
                  }}
                >
                  <Pencil size={13} aria-hidden />
                </IconButton>
                <IconButton aria-label="Delete event" size="sm" onClick={() => setDeleting(e)}>
                  <Trash2 size={13} aria-hidden />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <CalendarEventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} defaultProjectId={projectId} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete event?"
        description={deleting ? `"${deleting.title}" will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await deleteMut.mutateAsync(deleting.id);
          notify.success('Event deleted');
          setDeleting(null);
        }}
      />
    </Card>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab | null) ?? 'overview';

  const { data, isLoading } = useProjectsQuery(LOOKUP_PARAMS);
  const project = data?.items.find((p) => p.id === id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useDeleteProject();

  useDocumentTitle(project?.name ?? 'Project');

  if (isLoading) return <FullScreenSpinner label="Loading project" />;

  if (!project) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-fg-secondary">Project not found</p>
        <Link to="/projects" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const setTab = (next: Tab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next });
  };

  return (
    <>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg-secondary">
        <ArrowLeft size={12} aria-hidden />
        Projects
      </Link>

      <PageHeader
        title={project.name}
        subtitle={project.direction || '// project'}
        actions={
          <>
            <Chip tone={PROJECT_STATUS_TONES[project.status]} mono>
              {PROJECT_STATUS_LABELS[project.status]}
            </Chip>
            <Tooltip content="Edit">
              <IconButton aria-label="Edit project" onClick={() => setEditOpen(true)}>
                <Pencil size={14} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete project" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} aria-hidden />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <div className="mb-4 inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-1 p-0.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t ? 'bg-bg-3 text-fg-primary' : 'text-fg-muted hover:text-fg-secondary',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Dates</span>
                <p className="mt-0.5 font-mono text-sm text-fg-secondary">
                  {project.starts_at ?? '—'} → {project.ends_at ?? '—'}
                </p>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Slug</span>
                <p className="mt-0.5 font-mono text-sm text-fg-secondary">{project.slug || '—'}</p>
              </div>
            </div>
            {project.description ? (
              <p className="mt-4 border-t border-border-subtle pt-4 text-sm text-fg-secondary">
                {project.description}
              </p>
            ) : null}
          </Card>

          <Card>
            <TagPicker entityId={project.id} />
          </Card>

          <LinkedEntitiesPanel entityId={project.id} />
          <DynamicFieldsForm entityType="PROJECT" entityId={project.id} />
        </div>
      ) : tab === 'services' ? (
        <ServicesTab projectId={project.id} />
      ) : tab === 'clients' ? (
        <ClientsTab projectId={project.id} />
      ) : tab === 'tasks' ? (
        <TasksTab projectId={project.id} />
      ) : (
        <CalendarTab projectId={project.id} />
      )}

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project?"
        description={`"${project.name}" and its scoped view will be removed. Linked services/clients/tasks/events stay, unlinked from this project.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteMut.mutateAsync(project.id);
          notify.success('Project deleted');
          navigate('/projects');
        }}
      />
    </>
  );
}
