import { useEffect, useMemo, useState } from 'react';
import { Package, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DataView,
  IconButton,
  Input,
  Pagination,
  Select,
  Tooltip,
  ViewToggle,
  notify,
  type DataColumn,
  type ViewMode,
} from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';
import { useAllProjectsQuery } from '@entities/project';
import {
  formatDuration,
  formatPrice,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_OPTIONS,
  SERVICE_STATUS_TONES,
  useDeleteService,
  useServicesQuery,
  type Service,
  type ServiceListParams,
  type ServiceSortBy,
  type ServiceStatus,
} from '@entities/service';
import { ServiceFormDialog } from '@features/manage-service';
import { EntityExtrasDialog } from '@widgets/entity-panels';
import { ServiceCard } from './ServiceCard';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...SERVICE_STATUS_OPTIONS];

export function ServicesPage() {
  useDocumentTitle('Services');

  const [view, setView] = useState<ViewMode>('cards');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<ServiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ServiceSortBy>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const { data: projectsData } = useAllProjectsQuery();
  const projects = useMemo(() => projectsData?.items ?? [], [projectsData]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const projectFilterOptions = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const params: ServiceListParams = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    project_id: projectId || undefined,
    status: status || undefined,
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isFetching } = useServicesQuery(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [extrasFor, setExtrasFor] = useState<Service | null>(null);
  const deleteMut = useDeleteService();

  const hasFilters = !!search || !!projectId || !!status;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: Service) => {
    setEditing(s);
    setFormOpen(true);
  };

  const handleSort = (key: string) => {
    const k = key as ServiceSortBy;
    if (k === sortBy) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setOrder('asc');
    }
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      notify.success('Service deleted', { description: deleting.name });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const columns = useMemo<DataColumn<Service>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortKey: 'name',
        cell: (s) => <span className="font-medium text-fg-primary">{s.name}</span>,
      },
      {
        key: 'project',
        header: 'Project',
        cell: (s) => (
          <span className="text-xs text-fg-secondary">
            {s.project_id ? projectById.get(s.project_id)?.name ?? '—' : '—'}
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        cell: (s) => <span className="text-xs text-fg-secondary">{s.category || '—'}</span>,
      },
      {
        key: 'price',
        header: 'Price',
        sortKey: 'price',
        cell: (s) => <span className="font-mono text-xs text-fg-secondary">{formatPrice(s.price, s.currency)}</span>,
      },
      {
        key: 'duration',
        header: 'Duration',
        cell: (s) => <span className="font-mono text-xs text-fg-muted">{formatDuration(s.duration_min)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortKey: 'status',
        cell: (s) => (
          <Chip tone={SERVICE_STATUS_TONES[s.status]} mono>
            {SERVICE_STATUS_LABELS[s.status]}
          </Chip>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (s) => (
          <span className="inline-flex items-center gap-1">
            <Tooltip content="Tags & links">
              <IconButton aria-label="Tags and links" size="sm" onClick={() => setExtrasFor(s)}>
                <Tags size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Edit">
              <IconButton aria-label="Edit service" size="sm" onClick={() => openEdit(s)}>
                <Pencil size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete service" size="sm" onClick={() => setDeleting(s)}>
                <Trash2 size={13} aria-hidden />
              </IconButton>
            </Tooltip>
          </span>
        ),
      },
    ],
    [projectById],
  );

  const emptyState = (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Package size={22} aria-hidden className="text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          {hasFilters ? 'No services match your filters' : 'No services yet'}
        </p>
        {!hasFilters ? (
          <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New service
          </Button>
        ) : null}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Services"
        subtitle={'// service catalog'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New service
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search services"
        />
        <Select
          options={projectFilterOptions}
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by project"
          containerClassName="w-44"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ServiceStatus | '');
            setPage(1);
          }}
          aria-label="Filter by status"
          containerClassName="w-36"
        />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <DataView<Service>
        items={items}
        columns={columns}
        renderCard={(s) => (
          <ServiceCard
            service={s}
            project={s.project_id ? projectById.get(s.project_id) : undefined}
            onEdit={openEdit}
            onDelete={setDeleting}
            onExtras={setExtrasFor}
          />
        )}
        getRowKey={(s) => s.id}
        view={view}
        isLoading={isLoading || (isFetching && items.length === 0)}
        empty={emptyState}
        sort={{ by: sortBy, order }}
        onSortChange={handleSort}
      />

      {pagination && pagination.total > 0 ? (
        <Pagination
          className="mt-4"
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          onPageChange={setPage}
        />
      ) : null}

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editing} />

      <EntityExtrasDialog
        open={!!extrasFor}
        onOpenChange={(open) => {
          if (!open) setExtrasFor(null);
        }}
        title={extrasFor?.name ?? ''}
        entityType="SERVICE"
        entityId={extrasFor?.id ?? null}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete service?"
        description={deleting ? `"${deleting.name}" will be removed.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
