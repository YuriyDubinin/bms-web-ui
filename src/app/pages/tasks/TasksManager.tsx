import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ApiError,
  deleteTask,
  type Client,
  type Deal,
  type Process,
  type Project,
  type Service,
  type Task,
  type User,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog, DataTable, type DataTableColumn } from '@app/ui';
import { TaskFormDialog } from './TaskFormDialog';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, formatDueAt, isOverdue } from './model';
import { PriorityChip, StatusChip } from './chips';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

export type TasksManagerProps = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  /** Перезагрузить задачи после создания/редактирования/удаления. */
  reload: () => void;
  projects: Project[];
  clients: Client[];
  /** Сделки организации — для привязки задачи к сделке и резолва её названия. */
  deals: Deal[];
  /** Операторы организации — для выбора/резолва исполнителя. */
  users: User[];
  /** Услуги организации — для привязки задачи к услуге (передаётся в форму). */
  services?: Service[];
  /** Процессы организации — для привязки задачи к процессу (передаётся в форму). */
  processes?: Process[];
  /** Предвыбранный проект при создании (со страницы проекта задача создаётся в его разрезе). */
  defaultProjectId?: string;
  /** Показывать колонку «Проект». На странице проекта не нужна (все задачи одного проекта). */
  showProjectColumn?: boolean;
};

/**
 * Таблица задач с полным CRUD (создание/редактирование/удаление через модалки).
 * Переиспользуется в общем разделе (`TasksPage`) и — при необходимости — во вкладке
 * «Задачи» на странице проекта/клиента. Данными владеет родитель и передаёт их пропсами.
 */
export function TasksManager({
  tasks,
  isLoading,
  error,
  reload,
  projects,
  clients,
  deals,
  users,
  services = [],
  processes = [],
  defaultProjectId,
  showProjectColumn = true,
}: TasksManagerProps) {
  const { token, logout } = useAuth();
  const inProjectContext = !!defaultProjectId;

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);
  const projectName = useCallback(
    (id: string | null): string => (id ? (projectNameById.get(id) ?? '') : ''),
    [projectNameById],
  );

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.id, u.full_name || u.email);
    return map;
  }, [users]);
  const userName = useCallback(
    (id: string | null): string => (id ? (userNameById.get(id) ?? '') : ''),
    [userNameById],
  );

  const dealTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of deals) map.set(d.id, d.title);
    return map;
  }, [deals]);
  const dealTitle = useCallback(
    (id: string | null): string => (id ? (dealTitleById.get(id) ?? '') : ''),
    [dealTitleById],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (task: Task) => {
    setEditing(task);
    setFormOpen(true);
  };
  const askDelete = (task: Task) => {
    setDeleteError(null);
    setDeleting(task);
  };

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteTask(token, deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setDeleting(null);
        reload();
        return;
      }
      setDeleteError('Не удалось удалить задачу. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<Task>[]>(() => {
    const cols: DataTableColumn<Task>[] = [
      {
        key: 'title',
        header: 'Задача',
        value: (t) => t.title,
        sortable: true,
        cell: (t) => (
          <div className="min-w-0">
            <div className="font-medium text-fg-primary">{t.title}</div>
            {t.description ? (
              <div className="truncate text-[11px] text-fg-muted">{t.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        value: (t) => TASK_STATUS_LABELS[t.status],
        filter: 'select',
        filterLabel: 'Статус',
        cell: (t) => <StatusChip status={t.status} />,
      },
      {
        key: 'priority',
        header: 'Приоритет',
        value: (t) => TASK_PRIORITY_LABELS[t.priority],
        filter: 'select',
        filterLabel: 'Приоритет',
        cell: (t) => <PriorityChip priority={t.priority} />,
      },
      {
        key: 'due_at',
        header: 'Срок',
        value: (t) => t.due_at ?? '',
        searchable: false,
        sortable: true,
        cell: (t) => (
          <span
            className={cx(
              'font-mono text-xs',
              isOverdue(t.due_at, t.status) ? 'font-medium text-state-error' : 'text-fg-secondary',
            )}
          >
            {formatDueAt(t.due_at)}
          </span>
        ),
      },
      {
        key: 'assignee',
        header: 'Исполнитель',
        value: (t) => userName(t.assigned_to),
        filter: 'select',
        filterLabel: 'Исполнитель',
        cell: (t) => {
          const name = userName(t.assigned_to);
          return name ? (
            <span className="text-fg-secondary">{name}</span>
          ) : (
            <span className="text-fg-muted">—</span>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (t) => (
          <div className="inline-flex items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(t)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(t)}>
              <TrashIcon />
            </RowAction>
          </div>
        ),
      },
    ];

    // Колонка «Проект» нужна только в общем разделе — на странице проекта все задачи его же.
    if (showProjectColumn) {
      cols.splice(4, 0, {
        key: 'project',
        header: 'Проект',
        value: (t) => projectName(t.project_id),
        filter: 'select',
        filterLabel: 'Проект',
        cell: (t) => {
          const name = projectName(t.project_id);
          return name ? name : <span className="text-fg-muted">—</span>;
        },
      });
    }

    return cols;
  }, [projectName, userName, showProjectColumn]);

  const renderCard = (t: Task): ReactNode => {
    const assignee = userName(t.assigned_to);
    const name = projectName(t.project_id);
    const overdue = isOverdue(t.due_at, t.status);
    return (
      <div className="flex h-full min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate font-semibold text-fg-primary">{t.title}</p>
          <StatusChip status={t.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityChip priority={t.priority} />
          {t.due_at ? (
            <span
              className={cx(
                'font-mono text-xs',
                overdue ? 'font-medium text-state-error' : 'text-fg-muted',
              )}
            >
              {formatDueAt(t.due_at)}
            </span>
          ) : null}
        </div>
        {t.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-secondary">{t.description}</p>
        ) : null}
        {showProjectColumn && name ? (
          <p className="truncate font-mono text-xs text-fg-secondary">{name}</p>
        ) : null}
        {dealTitle(t.deal_id) ? (
          <p className="min-w-0 truncate text-xs text-fg-secondary">
            <span className="text-fg-muted">Сделка: </span>
            {dealTitle(t.deal_id)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="min-w-0 truncate text-xs text-fg-muted">
            {assignee || 'Без исполнителя'}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(t)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(t)}>
              <TrashIcon />
            </RowAction>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-md bg-state-error-muted px-4 py-3 text-sm text-state-error"
        >
          {error}
        </div>
      ) : null}

      <DataTable
        data={tasks}
        columns={columns}
        getRowId={(t) => t.id}
        renderCard={renderCard}
        isLoading={isLoading}
        pageSize={10}
        searchPlaceholder="Поиск по заголовку задачи…"
        toolbarActions={
          <Button size="sm" leftIcon={<PlusIcon />} onClick={openCreate}>
            {inProjectContext ? 'Добавить задачу' : 'Новая задача'}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
            <p className="text-sm text-fg-secondary">
              {inProjectContext ? 'У этого проекта пока нет задач' : 'Пока нет ни одной задачи'}
            </p>
            <Button leftIcon={<PlusIcon />} onClick={openCreate}>
              {inProjectContext ? 'Добавить задачу' : 'Создать первую задачу'}
            </Button>
          </div>
        }
      />

      <TaskFormDialog
        open={formOpen}
        task={editing}
        projects={projects}
        clients={clients}
        deals={deals}
        users={users}
        services={services}
        processes={processes}
        defaultProjectId={editing ? undefined : defaultProjectId}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => (deleteLoading ? undefined : setDeleting(null))}
        onConfirm={confirmDelete}
        title="Удалить задачу?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Задача <span className="font-medium text-fg-primary">{deleting?.title}</span> будет
            удалена. Это действие мягкое — задача исчезнет из списков.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
