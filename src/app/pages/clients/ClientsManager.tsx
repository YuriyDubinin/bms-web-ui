import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ApiError, deleteClient, type Client, type Project } from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog, DataTable, type DataTableColumn } from '@app/ui';
import { ClientFormDialog } from './ClientFormDialog';
import { CLIENT_STATUS_LABELS, clientName, clientSubtitle, formatAddress } from './model';
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

export type ClientsManagerProps = {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  /** Перезагрузить клиентов после создания/редактирования/удаления. */
  reload: () => void;
  /** Проекты организации — для select в форме и резолва имени проекта в таблице. */
  projects: Project[];
  /** Предвыбранный проект при создании (со страницы проекта клиент создаётся в его разрезе). */
  defaultProjectId?: string;
  /** Показывать колонку «Проект». На странице проекта не нужна (все клиенты одного проекта). */
  showProjectColumn?: boolean;
};

/**
 * Таблица клиентов с полным CRUD (создание/редактирование/удаление через модалки).
 * Переиспользуется в общем разделе (`ClientsPage`) и — при необходимости — во вкладке
 * «Клиенты» на странице проекта. Данными владеет родитель и передаёт их пропсами.
 */
export function ClientsManager({
  clients,
  isLoading,
  error,
  reload,
  projects,
  defaultProjectId,
  showProjectColumn = true,
}: ClientsManagerProps) {
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
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (client: Client) => {
    setEditing(client);
    setFormOpen(true);
  };
  const askDelete = (client: Client) => {
    setDeleteError(null);
    setDeleting(client);
  };

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteClient(token, deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      // 404 — клиент уже удалён кем-то ещё; просто обновляем список.
      if (err instanceof ApiError && err.status === 404) {
        setDeleting(null);
        reload();
        return;
      }
      setDeleteError('Не удалось удалить клиента. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<Client>[]>(() => {
    const cols: DataTableColumn<Client>[] = [
      {
        key: 'name',
        header: 'Клиент',
        // В значение включаем и компанию — чтобы поиск находил клиента и по названию компании.
        value: (c) => `${clientName(c)} ${c.company_name}`.trim(),
        sortable: true,
        cell: (c) => {
          const subtitle = clientSubtitle(c);
          return (
            <div className="min-w-0">
              <div className="font-medium text-fg-primary">{clientName(c)}</div>
              {subtitle ? <div className="truncate text-[11px] text-fg-muted">{subtitle}</div> : null}
            </div>
          );
        },
      },
      {
        key: 'contacts',
        header: 'Контакты',
        value: (c) => `${c.email} ${c.phone}`.trim(),
        cell: (c) =>
          c.email || c.phone ? (
            <div className="min-w-0">
              {c.email ? <div className="truncate text-fg-secondary">{c.email}</div> : null}
              {c.phone ? (
                <div className="truncate font-mono text-xs text-fg-muted">{c.phone}</div>
              ) : null}
            </div>
          ) : (
            <span className="text-fg-muted">—</span>
          ),
      },
      {
        key: 'source',
        header: 'Источник',
        value: (c) => c.source,
        filter: 'select',
        filterLabel: 'Источник',
        cell: (c) =>
          c.source ? (
            <span className="font-mono text-xs text-fg-secondary">{c.source}</span>
          ) : (
            <span className="text-fg-muted">—</span>
          ),
      },
      {
        key: 'status',
        header: 'Статус',
        value: (c) => CLIENT_STATUS_LABELS[c.status],
        filter: 'select',
        filterLabel: 'Статус',
        cell: (c) => <StatusChip status={c.status} />,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (c) => (
          <div className="inline-flex items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(c)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(c)}>
              <TrashIcon />
            </RowAction>
          </div>
        ),
      },
    ];

    // Колонка «Проект» нужна только в общем разделе — на странице проекта все клиенты его же.
    if (showProjectColumn) {
      cols.splice(3, 0, {
        key: 'project',
        header: 'Проект',
        value: (c) => projectName(c.project_id),
        filter: 'select',
        filterLabel: 'Проект',
        cell: (c) => {
          const name = projectName(c.project_id);
          return name ? name : <span className="text-fg-muted">—</span>;
        },
      });
    }

    return cols;
  }, [projectName, showProjectColumn]);

  const renderCard = (c: Client): ReactNode => {
    const subtitle = clientSubtitle(c);
    const name = projectName(c.project_id);
    const address = formatAddress(c.address);
    const footer = c.source || address;
    return (
      <div className="flex h-full min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg-primary">{clientName(c)}</p>
            {subtitle ? (
              <p className="truncate text-[11px] text-fg-muted">{subtitle}</p>
            ) : null}
          </div>
          <StatusChip status={c.status} />
        </div>
        <div className="min-w-0 space-y-0.5">
          {c.email ? <p className="truncate text-sm text-fg-secondary">{c.email}</p> : null}
          {c.phone ? <p className="truncate font-mono text-xs text-fg-muted">{c.phone}</p> : null}
        </div>
        {showProjectColumn && name ? (
          <p className="truncate font-mono text-xs text-fg-secondary">{name}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="min-w-0 truncate font-mono text-[11px] text-fg-muted">
            {footer || '—'}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(c)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(c)}>
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
        data={clients}
        columns={columns}
        getRowId={(c) => c.id}
        renderCard={renderCard}
        onRowClick={openEdit}
        isLoading={isLoading}
        pageSize={10}
        searchPlaceholder="Поиск по имени, компании, email…"
        toolbarActions={
          <Button size="sm" leftIcon={<PlusIcon />} onClick={openCreate}>
            {inProjectContext ? 'Добавить клиента' : 'Новый клиент'}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
            <p className="text-sm text-fg-secondary">
              {inProjectContext ? 'У этого проекта пока нет клиентов' : 'Пока нет ни одного клиента'}
            </p>
            <Button leftIcon={<PlusIcon />} onClick={openCreate}>
              {inProjectContext ? 'Добавить клиента' : 'Добавить первого клиента'}
            </Button>
          </div>
        }
      />

      <ClientFormDialog
        open={formOpen}
        client={editing}
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
        title="Удалить клиента?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Клиент{' '}
            <span className="font-medium text-fg-primary">
              {deleting ? clientName(deleting) : ''}
            </span>{' '}
            будет удалён. Связанные сделки, задачи и услуги при этом сохранятся в истории.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
