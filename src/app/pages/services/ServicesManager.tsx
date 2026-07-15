import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ApiError, deleteService, type Project, type Service } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog, DataTable, type DataTableColumn } from '@app/ui';
import { ServiceFormDialog } from './ServiceFormDialog';
import { SERVICE_STATUS_LABELS, formatDuration, formatPrice } from './model';
import { StatusChip } from './StatusChip';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';

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

export type ServicesManagerProps = {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  /** Перезагрузить услуги после создания/редактирования/удаления. */
  reload: () => void;
  /** Проекты организации — для select в форме и резолва имени проекта в таблице. */
  projects: Project[];
  /** Предвыбранный проект при создании (со страницы проекта услуга создаётся в его разрезе). */
  defaultProjectId?: string;
  /** Показывать колонку «Проект». На странице проекта не нужна (все услуги одного проекта). */
  showProjectColumn?: boolean;
};

/**
 * Таблица услуг с полным CRUD (создание/редактирование/удаление через модалки).
 * Переиспользуется и в общем каталоге (`ServicesPage`), и во вкладке «Услуги» на странице
 * проекта. Данными владеет родитель и передаёт их пропсами — так один и тот же список
 * питает и таблицу, и счётчики на странице проекта.
 */
export function ServicesManager({
  services,
  isLoading,
  error,
  reload,
  projects,
  defaultProjectId,
  showProjectColumn = true,
}: ServicesManagerProps) {
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
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (service: Service) => {
    setEditing(service);
    setFormOpen(true);
  };
  const askDelete = (service: Service) => {
    setDeleteError(null);
    setDeleting(service);
  };

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteService(token, deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      // 404 — услуга уже удалена кем-то ещё; просто обновляем список.
      if (err instanceof ApiError && err.status === 404) {
        setDeleting(null);
        reload();
        return;
      }
      setDeleteError('Не удалось удалить услугу. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<Service>[]>(() => {
    const cols: DataTableColumn<Service>[] = [
      {
        key: 'name',
        header: 'Название',
        value: (s) => s.name,
        sortable: true,
        cell: (s) => (
          <div className="min-w-0">
            <div className="font-medium text-fg-primary">{s.name}</div>
            {s.description ? (
              <div className="truncate text-[11px] text-fg-muted">{s.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Категория',
        value: (s) => s.category,
        filter: 'select',
        filterLabel: 'Категория',
        cell: (s) =>
          s.category ? (
            <span className="font-mono text-xs text-fg-secondary">{s.category}</span>
          ) : (
            <span className="text-fg-muted">—</span>
          ),
      },
      {
        key: 'price',
        header: 'Цена',
        align: 'right',
        value: (s) => s.price ?? 0,
        searchable: false,
        sortable: true,
        cell: (s) => (
          <span className="font-mono text-xs text-fg-primary">{formatPrice(s.price, s.currency)}</span>
        ),
      },
      {
        key: 'duration',
        header: 'Длительность',
        value: (s) => s.duration_min ?? 0,
        searchable: false,
        sortable: true,
        cell: (s) => (
          <span className="font-mono text-xs text-fg-secondary">{formatDuration(s.duration_min)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        value: (s) => SERVICE_STATUS_LABELS[s.status],
        filter: 'select',
        filterLabel: 'Статус',
        cell: (s) => <StatusChip status={s.status} />,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (s) => (
          <div className="inline-flex items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(s)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(s)}>
              <TrashIcon />
            </RowAction>
          </div>
        ),
      },
    ];

    // Колонка «Проект» нужна только в общем каталоге — на странице проекта все услуги его же.
    if (showProjectColumn) {
      cols.splice(2, 0, {
        key: 'project',
        header: 'Проект',
        value: (s) => projectName(s.project_id),
        filter: 'select',
        filterLabel: 'Проект',
        cell: (s) => {
          const name = projectName(s.project_id);
          return name ? name : <span className="text-fg-muted">—</span>;
        },
      });
    }

    return cols;
  }, [projectName, showProjectColumn]);

  const renderCard = (s: Service): ReactNode => {
    const name = projectName(s.project_id);
    return (
      <div className="flex h-full min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg-primary">{s.name}</p>
            {s.category ? (
              <p className="truncate font-mono text-[11px] text-fg-muted">{s.category}</p>
            ) : null}
          </div>
          <StatusChip status={s.status} />
        </div>
        {showProjectColumn && name ? (
          <p className="truncate font-mono text-xs text-fg-secondary">{name}</p>
        ) : null}
        {s.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-secondary">{s.description}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="min-w-0 truncate font-mono text-xs">
            <span className="text-fg-primary">{formatPrice(s.price, s.currency)}</span>
            {s.duration_min !== null ? (
              <span className="text-fg-muted"> · {formatDuration(s.duration_min)}</span>
            ) : null}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(s)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(s)}>
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
        data={services}
        columns={columns}
        getRowId={(s) => s.id}
        renderCard={renderCard}
        onRowClick={openEdit}
        isLoading={isLoading}
        pageSize={10}
        searchPlaceholder="Поиск по названию услуги…"
        toolbarActions={
          <Button size="sm" leftIcon={<PlusIcon />} onClick={openCreate}>
            {inProjectContext ? 'Добавить услугу' : 'Новая услуга'}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
            <p className="text-sm text-fg-secondary">
              {inProjectContext ? 'У этого проекта пока нет услуг' : 'Пока нет ни одной услуги'}
            </p>
            <Button leftIcon={<PlusIcon />} onClick={openCreate}>
              {inProjectContext ? 'Добавить услугу' : 'Создать первую услугу'}
            </Button>
          </div>
        }
      />

      <ServiceFormDialog
        open={formOpen}
        service={editing}
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
        title="Удалить услугу?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Услуга <span className="font-medium text-fg-primary">{deleting?.name}</span> будет
            удалена из каталога. Связи со сделками и клиентами при этом сохранятся в истории.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
