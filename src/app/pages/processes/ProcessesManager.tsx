import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ApiError, deleteProcess, type Process, type Project } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog, DataTable, type DataTableColumn } from '@app/ui';
import { ProcessFormDialog } from './ProcessFormDialog';
import { PROCESS_STATUS_LABELS, formatDateTime, formatPeriod } from './model';
import { StatusChip } from './StatusChip';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';

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

export type ProcessesManagerProps = {
  processes: Process[];
  isLoading: boolean;
  error: string | null;
  /** Перезагрузить процессы после создания/редактирования/удаления. */
  reload: () => void;
  /** Проекты организации — для select в форме и резолва имени проекта в таблице. */
  projects: Project[];
  /** Предвыбранный проект при создании (со страницы проекта процесс создаётся в его разрезе). */
  defaultProjectId?: string;
  /** Показывать колонку «Проект». На странице проекта не нужна (все процессы одного проекта). */
  showProjectColumn?: boolean;
  /** Клик по строке — например, переход на внутреннюю страницу процесса. */
  onRowClick?: (process: Process) => void;
};

/**
 * Таблица процессов с полным CRUD (создание/редактирование/удаление через модалки).
 * Переиспользуется в общем разделе (`ProcessesPage`) и во вкладке «Процессы» на странице
 * проекта. Данными владеет родитель и передаёт их пропсами.
 */
export function ProcessesManager({
  processes,
  isLoading,
  error,
  reload,
  projects,
  defaultProjectId,
  showProjectColumn = true,
  onRowClick,
}: ProcessesManagerProps) {
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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  const [deleting, setDeleting] = useState<Process | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (process: Process) => {
    setEditing(process);
    setFormOpen(true);
  };
  const askDelete = (process: Process) => {
    setDeleteError(null);
    setDeleting(process);
  };

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProcess(token, deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      // 404 — процесс уже удалён кем-то ещё; просто обновляем список.
      if (err instanceof ApiError && err.status === 404) {
        setDeleting(null);
        reload();
        return;
      }
      setDeleteError('Не удалось удалить процесс. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<Process>[]>(() => {
    const cols: DataTableColumn<Process>[] = [
      {
        key: 'name',
        header: 'Название',
        value: (p) => p.name,
        sortable: true,
        cell: (p) => (
          <div className="min-w-0">
            <div className="font-medium text-fg-primary">{p.name}</div>
            {p.description ? (
              <div className="truncate text-[11px] text-fg-muted">{p.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        value: (p) => PROCESS_STATUS_LABELS[p.status],
        filter: 'select',
        filterLabel: 'Статус',
        cell: (p) => <StatusChip status={p.status} />,
      },
      {
        key: 'period',
        header: 'Период',
        value: (p) => p.starts_at ?? p.ends_at ?? '',
        searchable: false,
        sortable: true,
        cell: (p) =>
          p.starts_at || p.ends_at ? (
            <span className="font-mono text-xs text-fg-secondary">
              {formatPeriod(p.starts_at, p.ends_at)}
            </span>
          ) : (
            <span className="text-fg-muted">—</span>
          ),
      },
      {
        key: 'created_at',
        header: 'Создан',
        value: (p) => p.created_at,
        searchable: false,
        sortable: true,
        cell: (p) => (
          <span className="font-mono text-xs text-fg-secondary">
            {formatDateTime(p.created_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (p) => (
          <div className="inline-flex items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(p)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(p)}>
              <TrashIcon />
            </RowAction>
          </div>
        ),
      },
    ];

    // Колонка «Проект» нужна только в общем разделе — на странице проекта все процессы его же.
    if (showProjectColumn) {
      cols.splice(1, 0, {
        key: 'project',
        header: 'Проект',
        value: (p) => projectName(p.project_id),
        filter: 'select',
        filterLabel: 'Проект',
        cell: (p) => {
          const name = projectName(p.project_id);
          return name ? name : <span className="text-fg-muted">—</span>;
        },
      });
    }

    return cols;
  }, [projectName, showProjectColumn]);

  const renderCard = (p: Process): ReactNode => {
    const name = projectName(p.project_id);
    return (
      <div className="flex h-full min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate font-semibold text-fg-primary">{p.name}</p>
          <StatusChip status={p.status} />
        </div>
        {p.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-secondary">{p.description}</p>
        ) : null}
        {showProjectColumn && name ? (
          <p className="truncate font-mono text-xs text-fg-secondary">{name}</p>
        ) : null}
        {p.starts_at || p.ends_at ? (
          <p className="truncate font-mono text-xs text-fg-secondary">
            <span className="text-fg-muted">Период: </span>
            {formatPeriod(p.starts_at, p.ends_at)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="min-w-0 truncate font-mono text-[11px] text-fg-muted">
            {formatDateTime(p.created_at)}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(p)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(p)}>
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
        data={processes}
        columns={columns}
        getRowId={(p) => p.id}
        renderCard={renderCard}
        onRowClick={onRowClick}
        isLoading={isLoading}
        pageSize={10}
        searchPlaceholder="Поиск по названию процесса…"
        toolbarActions={
          <Button size="sm" leftIcon={<PlusIcon />} onClick={openCreate}>
            {inProjectContext ? 'Добавить процесс' : 'Новый процесс'}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
            <p className="text-sm text-fg-secondary">
              {inProjectContext
                ? 'У этого проекта пока нет процессов'
                : 'Пока нет ни одного процесса'}
            </p>
            <Button leftIcon={<PlusIcon />} onClick={openCreate}>
              {inProjectContext ? 'Добавить процесс' : 'Создать первый процесс'}
            </Button>
          </div>
        }
      />

      <ProcessFormDialog
        open={formOpen}
        process={editing}
        projects={projects}
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
        title="Удалить процесс?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Процесс <span className="font-medium text-fg-primary">{deleting?.name}</span> будет
            удалён. Это действие мягкое — процесс и его этапы исчезнут из списков.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
