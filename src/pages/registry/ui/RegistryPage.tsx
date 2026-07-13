import { useEffect, useMemo, useState } from 'react';
import { Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
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
import {
  REGISTRY_TYPES,
  useDeleteRegistry,
  useRegistriesQuery,
  type Registry,
  type RegistryListParams,
  type RegistrySortBy,
  type RegistryType,
  type SortOrder,
} from '@entities/registry';
import {
  RegistryConnectButton,
  RegistryFormDialog,
  RegistryImagesButton,
  RegistryPingButton,
  REGISTRY_TYPE_LABELS,
} from '@features/manage-registry';
import { RegistryCard } from './RegistryCard';
import {
  RegistryActiveBadge,
  RegistryCreds,
  RegistryDefaultMark,
  RegistryLastStatus,
  RegistryTypeBadge,
} from './RegistryBits';
import { formatShortDate } from './format';

const PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...REGISTRY_TYPES.map((t) => ({ value: t, label: REGISTRY_TYPE_LABELS[t] })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

export function RegistryPage() {
  useDocumentTitle('Registry');

  const [view, setView] = useState<ViewMode>('table');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<RegistryType | ''>('');
  const [status, setStatus] = useState<'' | 'active' | 'disabled'>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<RegistrySortBy>('created_at');
  const [order, setOrder] = useState<SortOrder>('desc');

  // Дебаунс поиска.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const params: RegistryListParams = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    type: type || undefined,
    is_active: status === '' ? undefined : status === 'active',
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isFetching } = useRegistriesQuery(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Registry | null>(null);
  const [deleting, setDeleting] = useState<Registry | null>(null);
  const deleteMut = useDeleteRegistry();

  const hasFilters = !!search || !!type || status !== '';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: Registry) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleSort = (key: string) => {
    const k = key as RegistrySortBy;
    if (k === sortBy) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(k);
      setOrder('asc');
    }
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      notify.success('Registry deleted', { description: deleting.name });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const columns = useMemo<DataColumn<Registry>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortKey: 'name',
        cell: (r) => (
          <span className="inline-flex items-center gap-2">
            <span className="font-medium text-fg-primary">{r.name}</span>
            <RegistryDefaultMark isDefault={r.is_default} />
          </span>
        ),
      },
      { key: 'type', header: 'Type', sortKey: 'type', cell: (r) => <RegistryTypeBadge type={r.type} /> },
      {
        key: 'url',
        header: 'URL',
        cell: (r) => (
          <span className="block max-w-[240px] truncate font-mono text-xs text-fg-secondary" title={r.url}>
            {r.url}
          </span>
        ),
      },
      { key: 'status', header: 'Status', cell: (r) => <RegistryActiveBadge active={r.is_active} /> },
      { key: 'check', header: 'Last check', cell: (r) => <RegistryLastStatus status={r.last_status} /> },
      {
        key: 'creds',
        header: 'Creds',
        align: 'center',
        cell: (r) => (
          <span className="inline-flex justify-center">
            <RegistryCreds has={r.has_credentials} />
          </span>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        sortKey: 'created_at',
        align: 'right',
        cell: (r) => (
          <span className="font-mono text-[11px] text-fg-muted">{formatShortDate(r.created_at)}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (r) => (
          <span className="inline-flex items-center gap-1">
            <RegistryImagesButton registry={r} />
            <RegistryConnectButton registry={r} />
            <RegistryPingButton registry={r} />
            <Tooltip content="Edit">
              <IconButton aria-label="Edit registry" size="sm" onClick={() => openEdit(r)}>
                <Pencil size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete registry" size="sm" onClick={() => setDeleting(r)}>
                <Trash2 size={13} aria-hidden />
              </IconButton>
            </Tooltip>
          </span>
        ),
      },
    ],
    [],
  );

  const emptyState = (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Boxes size={22} aria-hidden className="text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          {hasFilters ? 'No registries match your filters' : 'No registry connections'}
        </p>
        {!hasFilters ? (
          <>
            <p className="font-mono text-xs text-fg-muted">
              Add your first Docker registry to get started.
            </p>
            <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
              Add registry
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Registry"
        subtitle={'// docker registries'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            Add registry
          </Button>
        }
      />

      {/* Тулбар: фильтры + переключатель вида */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search registries"
        />
        <Select
          options={TYPE_OPTIONS}
          value={type}
          onChange={(e) => {
            setType(e.target.value as RegistryType | '');
            setPage(1);
          }}
          aria-label="Filter by type"
          containerClassName="w-40"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | 'active' | 'disabled');
            setPage(1);
          }}
          aria-label="Filter by status"
          containerClassName="w-40"
        />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <DataView<Registry>
        items={items}
        columns={columns}
        renderCard={(r) => <RegistryCard registry={r} onEdit={openEdit} onDelete={setDeleting} />}
        getRowKey={(r) => r.id}
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

      <RegistryFormDialog open={formOpen} onOpenChange={setFormOpen} registry={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete registry?"
        description={deleting ? `"${deleting.name}" will be removed from the list.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
