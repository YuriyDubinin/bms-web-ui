import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ApiError,
  deleteDeal,
  type Client,
  type Deal,
  type Project,
  type Service,
  type User,
} from '@app/api';
import { useAuth } from '@app/auth';
import { Button, ConfirmDialog, DataTable, type DataTableColumn } from '@app/ui';
import { DealFormDialog } from './DealFormDialog';
import { DEAL_STATUS_LABELS, DEAL_TYPE_LABELS, formatMoney, formatProbability } from './model';
import { StatusChip, TypeChip } from './StatusChip';
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

export type DealsManagerProps = {
  deals: Deal[];
  isLoading: boolean;
  error: string | null;
  /** Перезагрузить сделки после создания/редактирования/удаления. */
  reload: () => void;
  projects: Project[];
  clients: Client[];
  /** Услуги организации — для привязки услуги к сделке и резолва её названия. */
  services: Service[];
  /** Операторы организации — для выбора/резолва ответственного. */
  users: User[];
  /** Предвыбранный проект при создании (со страницы проекта сделка создаётся в его разрезе). */
  defaultProjectId?: string;
  /** Показывать колонку «Проект». На странице проекта не нужна (все сделки одного проекта). */
  showProjectColumn?: boolean;
};

/**
 * Таблица сделок с полным CRUD (создание/редактирование/удаление через модалки).
 * Переиспользуется в общем разделе (`DealsPage`) и — при необходимости — во вкладке
 * «Сделки» на странице проекта/клиента. Данными владеет родитель и передаёт их пропсами.
 */
export function DealsManager({
  deals,
  isLoading,
  error,
  reload,
  projects,
  clients,
  services,
  users,
  defaultProjectId,
  showProjectColumn = true,
}: DealsManagerProps) {
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

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) map.set(s.id, s.name);
    return map;
  }, [services]);
  const serviceName = useCallback(
    (id: string | null): string => (id ? (serviceNameById.get(id) ?? '') : ''),
    [serviceNameById],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setFormOpen(true);
  };
  const askDelete = (deal: Deal) => {
    setDeleteError(null);
    setDeleting(deal);
  };

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteDeal(token, deleting.id);
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
      setDeleteError('Не удалось удалить сделку. Попробуйте ещё раз.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<Deal>[]>(() => {
    const cols: DataTableColumn<Deal>[] = [
      {
        key: 'title',
        header: 'Сделка',
        value: (d) => d.title,
        sortable: true,
        cell: (d) => (
          <div className="min-w-0">
            <div className="font-medium text-fg-primary">{d.title}</div>
            {d.description ? (
              <div className="truncate text-[11px] text-fg-muted">{d.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        value: (d) => DEAL_STATUS_LABELS[d.status],
        filter: 'select',
        filterLabel: 'Статус',
        cell: (d) => <StatusChip status={d.status} />,
      },
      {
        key: 'type',
        header: 'Тип',
        value: (d) => DEAL_TYPE_LABELS[d.type],
        filter: 'select',
        filterLabel: 'Тип',
        cell: (d) => <TypeChip type={d.type} />,
      },
      {
        key: 'amount',
        header: 'Сумма',
        align: 'right',
        value: (d) => d.amount ?? 0,
        searchable: false,
        sortable: true,
        cell: (d) => (
          <span className="font-mono text-xs text-fg-primary">
            {formatMoney(d.amount, d.currency)}
          </span>
        ),
      },
      {
        key: 'probability',
        header: 'Вероятность',
        align: 'right',
        value: (d) => d.probability ?? 0,
        searchable: false,
        sortable: true,
        cell: (d) => (
          <span className="font-mono text-xs text-fg-secondary">
            {formatProbability(d.probability)}
          </span>
        ),
      },
      {
        key: 'assignee',
        header: 'Ответственный',
        value: (d) => userName(d.assigned_to),
        filter: 'select',
        filterLabel: 'Ответственный',
        cell: (d) => {
          const name = userName(d.assigned_to);
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
        cell: (d) => (
          <div className="inline-flex items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(d)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(d)}>
              <TrashIcon />
            </RowAction>
          </div>
        ),
      },
    ];

    // Колонка «Проект» нужна только в общем разделе — на странице проекта все сделки его же.
    // Вставляем перед колонкой «Ответственный» (индекс 5: title, status, type, amount, probability).
    if (showProjectColumn) {
      cols.splice(5, 0, {
        key: 'project',
        header: 'Проект',
        value: (d) => projectName(d.project_id),
        filter: 'select',
        filterLabel: 'Проект',
        cell: (d) => {
          const name = projectName(d.project_id);
          return name ? name : <span className="text-fg-muted">—</span>;
        },
      });
    }

    return cols;
  }, [projectName, userName, showProjectColumn]);

  const renderCard = (d: Deal): ReactNode => {
    const assignee = userName(d.assigned_to);
    const name = projectName(d.project_id);
    return (
      <div className="flex h-full min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate font-semibold text-fg-primary">{d.title}</p>
          <StatusChip status={d.status} />
        </div>
        {d.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-secondary">{d.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TypeChip type={d.type} />
          <span className="font-mono text-sm text-fg-primary">
            {formatMoney(d.amount, d.currency)}
          </span>
          {d.probability !== null ? (
            <span className="font-mono text-xs text-fg-muted">
              · {formatProbability(d.probability)}
            </span>
          ) : null}
        </div>
        {showProjectColumn && name ? (
          <p className="truncate font-mono text-xs text-fg-secondary">{name}</p>
        ) : null}
        {serviceName(d.service_id) ? (
          <p className="min-w-0 truncate text-xs text-fg-secondary">
            <span className="text-fg-muted">Услуга: </span>
            {serviceName(d.service_id)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="min-w-0 truncate text-xs text-fg-muted">
            {assignee || 'Без ответственного'}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <RowAction label="Редактировать" onClick={() => openEdit(d)}>
              <PencilIcon />
            </RowAction>
            <RowAction label="Удалить" onClick={() => askDelete(d)}>
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
        data={deals}
        columns={columns}
        getRowId={(d) => d.id}
        renderCard={renderCard}
        isLoading={isLoading}
        pageSize={10}
        searchPlaceholder="Поиск по названию сделки…"
        toolbarActions={
          <Button size="sm" leftIcon={<PlusIcon />} onClick={openCreate}>
            {inProjectContext ? 'Добавить сделку' : 'Новая сделка'}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center">
            <p className="text-sm text-fg-secondary">
              {inProjectContext ? 'У этого проекта пока нет сделок' : 'Пока нет ни одной сделки'}
            </p>
            <Button leftIcon={<PlusIcon />} onClick={openCreate}>
              {inProjectContext ? 'Добавить сделку' : 'Создать первую сделку'}
            </Button>
          </div>
        }
      />

      <DealFormDialog
        open={formOpen}
        deal={editing}
        projects={projects}
        clients={clients}
        services={services}
        users={users}
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
        title="Удалить сделку?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            Сделка <span className="font-medium text-fg-primary">{deleting?.title}</span> будет
            удалена. Это действие мягкое — сделка исчезнет из списков и воронки.
          </p>
          {deleteError ? <p className="text-sm text-state-error">{deleteError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
