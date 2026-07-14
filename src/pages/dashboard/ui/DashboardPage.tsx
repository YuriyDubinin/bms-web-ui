import { Link } from 'react-router-dom';
import { CalendarDays, FolderGit2, ListChecks, Users } from 'lucide-react';
import { Card, Chip } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { useSessionStore } from '@entities/session';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES, useProjectsQuery } from '@entities/project';
import { useClientsQuery } from '@entities/client';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES, useTasksQuery } from '@entities/task';
import { useCalendarEventsQuery } from '@entities/calendar-event';

function Kpi({ icon: Icon, label, value, to }: { icon: typeof FolderGit2; label: string; value: number | undefined; to: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-3 transition-colors hover:border-border-strong">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-muted text-accent">
          <Icon size={16} aria-hidden />
        </span>
        <div>
          <p className="font-mono text-2xl leading-none text-fg-primary">{value ?? '—'}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{label}</p>
        </div>
      </Card>
    </Link>
  );
}

export function DashboardPage() {
  useDocumentTitle(null);
  const user = useSessionStore((s) => s.user);

  const { data: activeProjects } = useProjectsQuery({ status: 'ACTIVE', page_size: 1 });
  const { data: allClients } = useClientsQuery({ page_size: 1 });
  const { data: openTasks } = useTasksQuery({ page_size: 5, sort_by: 'due_at', order: 'asc' });
  const { data: upcomingEvents } = useCalendarEventsQuery({
    page_size: 5,
    from: new Date().toISOString(),
    sort_by: 'starts_at',
    order: 'asc',
  });
  const { data: recentProjects } = useProjectsQuery({ page_size: 5, sort_by: 'created_at', order: 'desc' });

  return (
    <>
      <PageHeader title={`Welcome${user ? `, ${user.full_name.split(' ')[0]}` : ''}`} subtitle={'// dashboard'} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={FolderGit2} label="Active projects" value={activeProjects?.pagination.total} to="/projects" />
        <Kpi icon={Users} label="Clients" value={allClients?.pagination.total} to="/clients" />
        <Kpi icon={ListChecks} label="Tasks" value={openTasks?.pagination.total} to="/tasks" />
        <Kpi icon={CalendarDays} label="Upcoming events" value={upcomingEvents?.pagination.total} to="/calendar" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-fg-primary">Recent projects</h3>
          <div className="flex flex-col divide-y divide-border-subtle">
            {(recentProjects?.items ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-fg-muted">No projects yet</p>
            ) : (
              recentProjects?.items.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0 hover:text-accent"
                >
                  <span className="truncate text-sm text-fg-primary">{p.name}</span>
                  <Chip tone={PROJECT_STATUS_TONES[p.status]} mono>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </Chip>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-fg-primary">Upcoming tasks</h3>
          <div className="flex flex-col divide-y divide-border-subtle">
            {(openTasks?.items ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-fg-muted">No tasks</p>
            ) : (
              openTasks?.items.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="truncate text-sm text-fg-primary">{t.title}</span>
                  <Chip tone={TASK_PRIORITY_TONES[t.priority]} mono>
                    {TASK_PRIORITY_LABELS[t.priority]}
                  </Chip>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-fg-primary">Upcoming events</h3>
          <div className="flex flex-col divide-y divide-border-subtle">
            {(upcomingEvents?.items ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-fg-muted">No upcoming events</p>
            ) : (
              upcomingEvents?.items.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="truncate text-sm text-fg-primary">{e.title}</span>
                  <span className="font-mono text-[11px] text-fg-muted">
                    {new Date(e.starts_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
