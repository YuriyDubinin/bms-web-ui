import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DataView,
  IconButton,
  Input,
  Select,
  Tooltip,
  notify,
  type DataColumn,
} from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { useAllProjectsQuery } from '@entities/project';
import { useAllUsersQuery } from '@entities/user';
import {
  buildUpdateFromTask,
  KANBAN_COLUMNS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  useDeleteTask,
  useTasksQuery,
  useUpdateTask,
  type Task,
  type TaskListParams,
  type TaskPriority,
  type TaskStatus,
} from '@entities/task';
import { TaskFormDialog } from '@features/manage-task';
import { EntityExtrasDialog } from '@widgets/entity-panels';
import { TaskKanbanCard } from './TaskKanbanCard';

type BoardMode = 'board' | 'list';

const PRIORITY_OPTIONS = [{ value: '', label: 'All priorities' }, ...TASK_PRIORITY_OPTIONS];

export function TasksPage() {
  useDocumentTitle('Tasks');

  const [mode, setMode] = useState<BoardMode>('board');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const { data: projectsData } = useAllProjectsQuery();
  const { data: usersData } = useAllUsersQuery();
  const projects = useMemo(() => projectsData?.items ?? [], [projectsData]);
  const users = useMemo(() => usersData?.items ?? [], [usersData]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const projectFilterOptions = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];
  const assigneeFilterOptions = [
    { value: '', label: 'Anyone' },
    ...users.map((u) => ({ value: u.id, label: u.full_name })),
  ];

  // Board показывает все статусы одним запросом с большим page_size — доска сама группирует по колонкам.
  const params: TaskListParams = {
    page: 1,
    page_size: 200,
    search: search || undefined,
    project_id: projectId || undefined,
    priority: priority || undefined,
    assigned_to: assignedTo || undefined,
    sort_by: 'due_at',
    order: 'asc',
  };

  const { data, isLoading } = useTasksQuery(params);
  const items = useMemo(() => data?.items ?? [], [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [extrasFor, setExtrasFor] = useState<Task | null>(null);
  const deleteMut = useDeleteTask();
  const updateMut = useUpdateTask();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setFormOpen(true);
  };

  const handleMove = async (task: Task, status: TaskStatus) => {
    try {
      await updateMut.mutateAsync(buildUpdateFromTask(task, { status }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not move task');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      notify.success('Task deleted', { description: deleting.title });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const byColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(KANBAN_COLUMNS.map((s) => [s, []]));
    for (const t of items) map.get(t.status)?.push(t);
    return map;
  }, [items]);

  const columns = useMemo<DataColumn<Task>[]>(
    () => [
      { key: 'title', header: 'Title', cell: (t) => <span className="font-medium text-fg-primary">{t.title}</span> },
      {
        key: 'status',
        header: 'Status',
        cell: (t) => (
          <Chip tone={TASK_STATUS_TONES[t.status]} mono>
            {TASK_STATUS_LABELS[t.status]}
          </Chip>
        ),
      },
      {
        key: 'priority',
        header: 'Priority',
        cell: (t) => (
          <Chip tone={TASK_PRIORITY_TONES[t.priority]} mono>
            {TASK_PRIORITY_LABELS[t.priority]}
          </Chip>
        ),
      },
      {
        key: 'assignee',
        header: 'Assignee',
        cell: (t) => (
          <span className="text-xs text-fg-secondary">
            {t.assigned_to ? userById.get(t.assigned_to)?.full_name ?? '—' : 'Unassigned'}
          </span>
        ),
      },
      {
        key: 'due',
        header: 'Due',
        cell: (t) => (
          <span className="font-mono text-[11px] text-fg-muted">
            {t.due_at ? new Date(t.due_at).toLocaleString() : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (t) => (
          <span className="inline-flex items-center gap-1">
            <Tooltip content="Tags & links">
              <IconButton aria-label="Tags and links" size="sm" onClick={() => setExtrasFor(t)}>
                <Tags size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Edit">
              <IconButton aria-label="Edit task" size="sm" onClick={() => openEdit(t)}>
                <Pencil size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete task" size="sm" onClick={() => setDeleting(t)}>
                <Trash2 size={13} aria-hidden />
              </IconButton>
            </Tooltip>
          </span>
        ),
      },
    ],
    [userById],
  );

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle={'// work items'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by title…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search tasks"
        />
        <Select
          options={projectFilterOptions}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Filter by project"
          containerClassName="w-44"
        />
        <Select
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
          aria-label="Filter by priority"
          containerClassName="w-36"
        />
        <Select
          options={assigneeFilterOptions}
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          aria-label="Filter by assignee"
          containerClassName="w-40"
        />
        <div className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-1 p-0.5">
          {(['board', 'list'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={
                mode === m
                  ? 'rounded-[5px] bg-bg-3 px-3 py-1 text-xs font-medium text-fg-primary'
                  : 'rounded-[5px] px-3 py-1 text-xs text-fg-muted hover:text-fg-secondary'
              }
            >
              {m === 'board' ? 'Board' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'list' ? (
        <DataView<Task>
          items={items}
          columns={columns}
          renderCard={() => null}
          getRowKey={(t) => t.id}
          view="table"
          isLoading={isLoading}
          empty={
            <Card>
              <p className="py-16 text-center text-sm text-fg-secondary">No tasks match your filters</p>
            </Card>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-cols-5">
          {KANBAN_COLUMNS.map((status) => {
            const columnTasks = byColumn.get(status) ?? [];
            return (
              <div key={status} className="flex min-w-[220px] flex-col gap-2 rounded-md bg-bg-1 p-2">
                <div className="flex items-center justify-between px-1">
                  <Chip tone={TASK_STATUS_TONES[status]} mono>
                    {TASK_STATUS_LABELS[status]}
                  </Chip>
                  <span className="font-mono text-[11px] text-fg-muted">{columnTasks.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {columnTasks.map((t) => (
                    <TaskKanbanCard
                      key={t.id}
                      task={t}
                      assignee={t.assigned_to ? userById.get(t.assigned_to) : undefined}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                      onMove={handleMove}
                      onExtras={setExtrasFor}
                    />
                  ))}
                  {columnTasks.length === 0 ? (
                    <p className="px-1 py-4 text-center font-mono text-[11px] text-fg-muted">empty</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} />

      <EntityExtrasDialog
        open={!!extrasFor}
        onOpenChange={(open) => {
          if (!open) setExtrasFor(null);
        }}
        title={extrasFor?.title ?? ''}
        entityType="TASK"
        entityId={extrasFor?.id ?? null}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete task?"
        description={deleting ? `"${deleting.title}" will be removed.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
