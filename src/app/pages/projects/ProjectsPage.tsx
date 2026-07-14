import { useMemo, useState, type ReactNode } from 'react';
import { ApiError, deleteProject, type Project } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog, DataTable, type DataTableColumn } from '@app/ui';
import { PageHeader } from '../PageHeader';
import { ProjectFormDialog } from './ProjectFormDialog';
import { useProjects } from './useProjects';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  formatDateTime,
  formatPeriod,
} from './model';

function PlusIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function StatusChip({ status }: { status: Project['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PROJECT_STATUS_TONE[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
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

export function ProjectsPage() {
  const { token, logout } = useAuth();
  const { projects, isLoading, error, reload } = useProjects();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (project: Project) => {
    setEditing(project);
    setFormOpen(true);
  };
  const askDelete = (project: Project) => {
    setDeleteError(null);
    setDeleting(project);
  };

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProject(token, deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      // 404 — проект уже удалён кем-то ещё; просто обновляем список.
      if (err instanceof ApiError && err.status === 404) {
        setDeleting(null);
        reload();
        return;
      }
      setDeleteError('Не удалось удалить проект. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<Project>[]>(
    () => [
      {
        key: 'name',
        header: 'Название',
        value: (p) => p.name,
        sortable: true,
        cell: (p) => (
          <div className="min-w-0">
            <div className="font-medium text-fg-primary">{p.name}</div>
            {p.slug ? <div className="font-mono text-[11px] text-fg-muted">{p.slug}</div> : null}
          </div>
        ),
      },
      {
        key: 'direction',
        header: 'Направление',
        value: (p) => p.direction,
        cell: (p) =>
          p.direction ? p.direction : <span className="text-fg-muted">—</span>,
      },
      {
        key: 'status',
        header: 'Статус',
        value: (p) => PROJECT_STATUS_LABELS[p.status],
        filter: 'select',
        filterLabel: 'Статус',
        cell: (p) => <StatusChip status={p.status} />,
      },
      {
        key: 'period',
        header: 'Период',
        value: (p) => p.starts_at ?? '',
        searchable: false,
        sortable: true,
        cell: (p) => (
          <span className="font-mono text-xs text-fg-secondary">
            {formatPeriod(p.starts_at, p.ends_at)}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Создан',
        align: 'right',
        value: (p) => p.created_at,
        searchable: false,
        sortable: true,
        cell: (p) => (
          <span className="font-mono text-xs text-fg-muted">{formatDateTime(p.created_at)}</span>
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
    ],
    [],
  );

  const renderCard = (p: Project): ReactNode => (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg-primary">{p.name}</p>
          {p.slug ? <p className="truncate font-mono text-[11px] text-fg-muted">{p.slug}</p> : null}
        </div>
        <StatusChip status={p.status} />
      </div>
      {p.direction ? <p className="font-mono text-xs text-fg-secondary">{p.direction}</p> : null}
      {p.description ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-fg-secondary">{p.description}</p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
        <span className="font-mono text-[11px] text-fg-muted">
          {formatPeriod(p.starts_at, p.ends_at)}
        </span>
        <div className="flex items-center gap-1">
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

  return (
    <>
      <PageHeader title="Проекты" subtitle="Портфель проектов компании" />

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-md bg-state-error-muted px-4 py-3 text-sm text-state-error"
        >
          {error}
        </div>
      ) : null}

      <DataTable
        data={projects}
        columns={columns}
        getRowId={(p) => p.id}
        renderCard={renderCard}
        onRowClick={openEdit}
        isLoading={isLoading}
        pageSize={10}
        searchPlaceholder="Поиск по названию и направлению…"
        toolbarActions={
          <Button size="sm" leftIcon={<PlusIcon />} onClick={openCreate}>
            Новый проект
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
            <p className="text-sm text-fg-secondary">Пока нет ни одного проекта</p>
            <Button leftIcon={<PlusIcon />} onClick={openCreate}>
              Создать первый проект
            </Button>
          </div>
        }
      />

      <ProjectFormDialog
        open={formOpen}
        project={editing}
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
        title="Удалить проект?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Проект <span className="font-medium text-fg-primary">{deleting?.name}</span> будет
            удалён. Прикреплённые услуги, клиенты и задачи не удаляются, но останутся без проекта.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
