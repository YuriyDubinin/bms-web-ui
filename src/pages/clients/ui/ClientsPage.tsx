import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Tags, Trash2, Users as ClientsIcon } from 'lucide-react';
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
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_STATUS_TONES,
  clientDisplayName,
  useClientsQuery,
  useDeleteClient,
  type Client,
  type ClientListParams,
  type ClientSortBy,
  type ClientStatus,
} from '@entities/client';
import { ClientFormDialog } from '@features/manage-client';
import { EntityExtrasDialog } from '@widgets/entity-panels';
import { ClientCard } from './ClientCard';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...CLIENT_STATUS_OPTIONS];

export function ClientsPage() {
  useDocumentTitle('Clients');

  const [view, setView] = useState<ViewMode>('cards');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<ClientStatus | ''>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ClientSortBy>('created_at');
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

  const params: ClientListParams = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    project_id: projectId || undefined,
    status: status || undefined,
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isFetching } = useClientsQuery(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [extrasFor, setExtrasFor] = useState<Client | null>(null);
  const deleteMut = useDeleteClient();

  const hasFilters = !!search || !!projectId || !!status;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleSort = (key: string) => {
    const k = key as ClientSortBy;
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
      notify.success('Client deleted', { description: clientDisplayName(deleting) });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const columns = useMemo<DataColumn<Client>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortKey: 'first_name',
        cell: (c) => <span className="font-medium text-fg-primary">{clientDisplayName(c)}</span>,
      },
      {
        key: 'contact',
        header: 'Contact',
        cell: (c) => (
          <span className="block font-mono text-xs text-fg-secondary">
            {c.email || c.phone || '—'}
          </span>
        ),
      },
      {
        key: 'project',
        header: 'Project',
        cell: (c) => (
          <span className="text-xs text-fg-secondary">
            {c.project_id ? projectById.get(c.project_id)?.name ?? '—' : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (c) => (
          <Chip tone={CLIENT_STATUS_TONES[c.status]} mono>
            {CLIENT_STATUS_LABELS[c.status]}
          </Chip>
        ),
      },
      {
        key: 'source',
        header: 'Source',
        cell: (c) => <span className="text-xs text-fg-muted">{c.source || '—'}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (c) => (
          <span className="inline-flex items-center gap-1">
            <Tooltip content="Tags & links">
              <IconButton aria-label="Tags and links" size="sm" onClick={() => setExtrasFor(c)}>
                <Tags size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Edit">
              <IconButton aria-label="Edit client" size="sm" onClick={() => openEdit(c)}>
                <Pencil size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete client" size="sm" onClick={() => setDeleting(c)}>
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
        <ClientsIcon size={22} aria-hidden className="text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          {hasFilters ? 'No clients match your filters' : 'No clients yet'}
        </p>
        {!hasFilters ? (
          <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New client
          </Button>
        ) : null}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={'// CRM contacts'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New client
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, company, email…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search clients"
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
            setStatus(e.target.value as ClientStatus | '');
            setPage(1);
          }}
          aria-label="Filter by status"
          containerClassName="w-36"
        />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <DataView<Client>
        items={items}
        columns={columns}
        renderCard={(c) => (
          <ClientCard client={c} onEdit={openEdit} onDelete={setDeleting} onExtras={setExtrasFor} />
        )}
        getRowKey={(c) => c.id}
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

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} />

      <EntityExtrasDialog
        open={!!extrasFor}
        onOpenChange={(open) => {
          if (!open) setExtrasFor(null);
        }}
        title={extrasFor ? clientDisplayName(extrasFor) : ''}
        entityType="CLIENT"
        entityId={extrasFor?.id ?? null}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete client?"
        description={deleting ? `"${clientDisplayName(deleting)}" will be removed.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
