import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Server as ServerIcon, Trash2 } from 'lucide-react';
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
import {
  formatShortDate,
  SERVER_AUTH_METHODS,
  SERVER_AUTH_METHOD_LABELS,
  SERVER_ENVIRONMENTS,
  SERVER_ENVIRONMENT_LABELS,
  SERVER_PROTOCOLS,
  SERVER_PROTOCOL_LABELS,
  ServerActiveBadge,
  ServerCreds,
  ServerEnvironmentBadge,
  ServerLastStatus,
  ServerProtocolBadge,
  ServerSshKeyBadge,
  useDeleteServer,
  useServersQuery,
  type Server,
  type ServerAuthMethod,
  type ServerEnvironment,
  type ServerListParams,
  type ServerProtocol,
  type ServerSortBy,
  type SortOrder,
} from '@entities/server';
import {
  ServerConnectButton,
  ServerFormDialog,
  ServerInstallKeyButton,
  ServerOpenButton,
  ServerPingButton,
} from '@features/manage-server';
import { ServerCard } from './ServerCard';

const PAGE_SIZE = 20;

const ENVIRONMENT_OPTIONS = [
  { value: '', label: 'All environments' },
  ...SERVER_ENVIRONMENTS.map((e) => ({ value: e, label: SERVER_ENVIRONMENT_LABELS[e] })),
];

const PROTOCOL_OPTIONS = [
  { value: '', label: 'All protocols' },
  ...SERVER_PROTOCOLS.map((p) => ({ value: p, label: SERVER_PROTOCOL_LABELS[p] })),
];

const AUTH_OPTIONS = [
  { value: '', label: 'All auth' },
  ...SERVER_AUTH_METHODS.map((m) => ({ value: m, label: SERVER_AUTH_METHOD_LABELS[m] })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

export function ServersPage() {
  useDocumentTitle('Servers');

  const [view, setView] = useState<ViewMode>('table');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [environment, setEnvironment] = useState<ServerEnvironment | ''>('');
  const [protocol, setProtocol] = useState<ServerProtocol | ''>('');
  const [authMethod, setAuthMethod] = useState<ServerAuthMethod | ''>('');
  const [status, setStatus] = useState<'' | 'active' | 'disabled'>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ServerSortBy>('created_at');
  const [order, setOrder] = useState<SortOrder>('desc');

  // Дебаунс поиска.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const params: ServerListParams = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    environment: environment || undefined,
    protocol: protocol || undefined,
    auth_method: authMethod || undefined,
    is_active: status === '' ? undefined : status === 'active',
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isFetching } = useServersQuery(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [deleting, setDeleting] = useState<Server | null>(null);
  const deleteMut = useDeleteServer();

  const hasFilters = !!search || !!environment || !!protocol || !!authMethod || status !== '';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: Server) => {
    setEditing(s);
    setFormOpen(true);
  };

  const handleSort = (key: string) => {
    const k = key as ServerSortBy;
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
      notify.success('Server deleted', { description: deleting.name });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const columns = useMemo<DataColumn<Server>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortKey: 'name',
        cell: (s) => <span className="font-medium text-fg-primary">{s.name}</span>,
      },
      {
        key: 'host',
        header: 'Host',
        sortKey: 'host',
        cell: (s) => (
          <span className="block max-w-[220px] truncate font-mono text-xs text-fg-secondary" title={`${s.host}:${s.port}`}>
            {s.host}:{s.port}
          </span>
        ),
      },
      {
        key: 'environment',
        header: 'Env',
        sortKey: 'environment',
        cell: (s) => <ServerEnvironmentBadge environment={s.environment} />,
      },
      { key: 'protocol', header: 'Proto', cell: (s) => <ServerProtocolBadge protocol={s.protocol} /> },
      { key: 'status', header: 'Status', cell: (s) => <ServerActiveBadge active={s.is_active} pulse /> },
      { key: 'check', header: 'Last check', cell: (s) => <ServerLastStatus status={s.last_status} /> },
      {
        key: 'system',
        header: 'System',
        cell: (s) => {
          const os = [s.os, s.arch].filter(Boolean).join(' / ');
          const cpu = s.cpu_cores != null ? `${s.cpu_cores}c` : null;
          const label = [os, cpu].filter(Boolean).join(' · ');
          return label ? (
            <span className="font-mono text-[11px] text-fg-secondary">{label}</span>
          ) : (
            <span className="font-mono text-[11px] text-fg-muted">—</span>
          );
        },
      },
      {
        key: 'tags',
        header: 'Tags',
        cell: (s) =>
          s.tags && s.tags.length > 0 ? (
            <span className="inline-flex max-w-[180px] flex-wrap gap-1">
              {s.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} tone="neutral" mono>
                  {tag}
                </Chip>
              ))}
              {s.tags.length > 3 ? (
                <span className="font-mono text-[11px] text-fg-muted">+{s.tags.length - 3}</span>
              ) : null}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-fg-muted">—</span>
          ),
      },
      {
        key: 'creds',
        header: 'Creds',
        align: 'center',
        cell: (s) => (
          <span className="inline-flex justify-center">
            <ServerCreds hasPassword={s.has_password} hasPrivateKey={s.has_private_key} />
          </span>
        ),
      },
      {
        key: 'app_key',
        header: 'App key',
        align: 'center',
        cell: (s) => (
          <span className="inline-flex justify-center">
            <ServerSshKeyBadge installed={!!s.ssh_key_installed} />
          </span>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        sortKey: 'created_at',
        align: 'right',
        cell: (s) => (
          <span className="font-mono text-[11px] text-fg-muted">{formatShortDate(s.created_at)}</span>
        ),
      },
      {
        key: 'open',
        header: 'Open',
        align: 'center',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (s) => (
          <span className="inline-flex justify-center">
            <ServerOpenButton server={s} />
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (s) => (
          <span className="inline-flex items-center gap-1">
            <ServerConnectButton server={s} />
            <ServerPingButton server={s} />
            {/* Install/Reinstall — только если сервер хоть раз успешно «коннектился». */}
            {s.last_status === 'OK' ? <ServerInstallKeyButton server={s} /> : null}
            <Tooltip content="Edit">
              <IconButton aria-label="Edit server" size="sm" onClick={() => openEdit(s)}>
                <Pencil size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete server" size="sm" onClick={() => setDeleting(s)}>
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
        <ServerIcon size={22} aria-hidden className="text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          {hasFilters ? 'No servers match your filters' : 'No server connections'}
        </p>
        {!hasFilters ? (
          <>
            <p className="font-mono text-xs text-fg-muted">Add your first server to get started.</p>
            <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
              Add server
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Servers"
        subtitle={'// remote servers'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            Add server
          </Button>
        }
      />

      {/* Тулбар: фильтры + переключатель вида */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or host…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search servers"
        />
        <Select
          options={ENVIRONMENT_OPTIONS}
          value={environment}
          onChange={(e) => {
            setEnvironment(e.target.value as ServerEnvironment | '');
            setPage(1);
          }}
          aria-label="Filter by environment"
          containerClassName="w-44"
        />
        <Select
          options={PROTOCOL_OPTIONS}
          value={protocol}
          onChange={(e) => {
            setProtocol(e.target.value as ServerProtocol | '');
            setPage(1);
          }}
          aria-label="Filter by protocol"
          containerClassName="w-36"
        />
        <Select
          options={AUTH_OPTIONS}
          value={authMethod}
          onChange={(e) => {
            setAuthMethod(e.target.value as ServerAuthMethod | '');
            setPage(1);
          }}
          aria-label="Filter by auth method"
          containerClassName="w-36"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | 'active' | 'disabled');
            setPage(1);
          }}
          aria-label="Filter by status"
          containerClassName="w-36"
        />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <DataView<Server>
        items={items}
        columns={columns}
        renderCard={(s) => <ServerCard server={s} onEdit={openEdit} onDelete={setDeleting} />}
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

      <ServerFormDialog open={formOpen} onOpenChange={setFormOpen} server={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete server?"
        description={deleting ? `"${deleting.name}" will be removed from the list.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
