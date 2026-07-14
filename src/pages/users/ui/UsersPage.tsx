import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Tags, Trash2, Users as UsersIcon } from 'lucide-react';
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
import { ROLES, type Role } from '@shared/api';
import {
  ROLE_LABELS,
  useDeleteUser,
  useUsersQuery,
  type User,
  type UserListParams,
  type UserSortBy,
} from '@entities/user';
import { sessionSelectors, useSessionStore } from '@entities/session';
import { UserFormDialog } from '@features/manage-user';
import { EntityExtrasDialog } from '@widgets/entity-panels';

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

export function UsersPage() {
  useDocumentTitle('Team');
  const currentUserId = useSessionStore((s) => s.user?.id);
  // Просмотр команды открыт всем операторам; создание/редактирование/удаление — только OWNER/ADMIN (👑 в API).
  const canManage = useSessionStore(sessionSelectors.isOwnerOrAdmin);

  const [view, setView] = useState<ViewMode>('table');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<'' | 'active' | 'disabled'>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<UserSortBy>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const params: UserListParams = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    role: role || undefined,
    is_active: status === '' ? undefined : status === 'active',
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isFetching } = useUsersQuery(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [extrasFor, setExtrasFor] = useState<User | null>(null);
  const deleteMut = useDeleteUser();

  const hasFilters = !!search || !!role || status !== '';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setFormOpen(true);
  };

  const handleSort = (key: string) => {
    const k = key as UserSortBy;
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
      notify.success('User removed', { description: deleting.full_name });
      setDeleting(null);
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'Could not remove user',
      );
    }
  };

  const columns = useMemo<DataColumn<User>[]>(
    () => [
      {
        key: 'full_name',
        header: 'Name',
        sortKey: 'full_name',
        cell: (u) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg-primary">{u.full_name}</span>
            {u.id === currentUserId ? (
              <Chip tone="accent" mono>
                you
              </Chip>
            ) : null}
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortKey: 'email',
        cell: (u) => <span className="font-mono text-xs text-fg-secondary">{u.email}</span>,
      },
      {
        key: 'role',
        header: 'Role',
        sortKey: 'role',
        cell: (u) => (
          <Chip tone={u.role === 'OWNER' || u.role === 'ADMIN' ? 'accent' : 'neutral'} mono>
            {ROLE_LABELS[u.role]}
          </Chip>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (u) => (
          <Chip tone={u.is_active ? 'success' : 'neutral'} mono>
            {u.is_active ? 'Active' : 'Disabled'}
          </Chip>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (u) => (
          <span className="inline-flex items-center gap-1">
            <Tooltip content="Tags & links">
              <IconButton aria-label="Tags and links" size="sm" onClick={() => setExtrasFor(u)}>
                <Tags size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            {canManage ? (
              <>
                <Tooltip content="Edit">
                  <IconButton aria-label="Edit user" size="sm" onClick={() => openEdit(u)}>
                    <Pencil size={13} aria-hidden />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Remove">
                  <IconButton aria-label="Remove user" size="sm" onClick={() => setDeleting(u)}>
                    <Trash2 size={13} aria-hidden />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
          </span>
        ),
      },
    ],
    [currentUserId, canManage],
  );

  const emptyState = (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <UsersIcon size={22} aria-hidden className="text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          {hasFilters ? 'No team members match your filters' : 'No team members yet'}
        </p>
        {!hasFilters && canManage ? (
          <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            Invite team member
          </Button>
        ) : null}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={'// operators & roles'}
        actions={
          canManage ? (
            <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
              Invite team member
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search team"
        />
        <Select
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '');
            setPage(1);
          }}
          aria-label="Filter by role"
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
          containerClassName="w-36"
        />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <DataView<User>
        items={items}
        columns={columns}
        renderCard={(u) => (
          <Card className="flex h-full flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-fg-primary">{u.full_name}</span>
              <Chip tone={u.role === 'OWNER' || u.role === 'ADMIN' ? 'accent' : 'neutral'} mono>
                {ROLE_LABELS[u.role]}
              </Chip>
            </div>
            <span className="truncate font-mono text-xs text-fg-secondary">{u.email}</span>
            <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
              <Chip tone={u.is_active ? 'success' : 'neutral'} mono>
                {u.is_active ? 'Active' : 'Disabled'}
              </Chip>
              <span className="inline-flex items-center gap-1">
                <IconButton aria-label="Tags and links" size="sm" onClick={() => setExtrasFor(u)}>
                  <Tags size={13} aria-hidden />
                </IconButton>
                {canManage ? (
                  <>
                    <IconButton aria-label="Edit user" size="sm" onClick={() => openEdit(u)}>
                      <Pencil size={13} aria-hidden />
                    </IconButton>
                    <IconButton aria-label="Remove user" size="sm" onClick={() => setDeleting(u)}>
                      <Trash2 size={13} aria-hidden />
                    </IconButton>
                  </>
                ) : null}
              </span>
            </div>
          </Card>
        )}
        getRowKey={(u) => u.id}
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

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />

      <EntityExtrasDialog
        open={!!extrasFor}
        onOpenChange={(open) => {
          if (!open) setExtrasFor(null);
        }}
        title={extrasFor?.full_name ?? ''}
        entityType="CUSTOMER_USER"
        entityId={extrasFor?.id ?? null}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Remove team member?"
        description={deleting ? `"${deleting.full_name}" will lose access immediately.` : undefined}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
