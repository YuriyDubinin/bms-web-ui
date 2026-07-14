import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderGit2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_STATUS_TONES,
  useDeleteProject,
  useProjectsQuery,
  type Project,
  type ProjectListParams,
  type ProjectSortBy,
  type ProjectStatus,
} from '@entities/project';
import { ProjectFormDialog } from '@features/manage-project';
import { Chip } from '@shared/ui';
import { ProjectCard } from './ProjectCard';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...PROJECT_STATUS_OPTIONS];

export function ProjectsPage() {
  useDocumentTitle('Projects');

  const [view, setView] = useState<ViewMode>('cards');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ProjectSortBy>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const params: ProjectListParams = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isFetching } = useProjectsQuery(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const deleteMut = useDeleteProject();

  const hasFilters = !!search || !!status;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditing(p);
    setFormOpen(true);
  };

  const handleSort = (key: string) => {
    const k = key as ProjectSortBy;
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
      notify.success('Project deleted', { description: deleting.name });
      setDeleting(null);
    } catch {
      // Ошибку покажет глобальный onError-toast; диалог оставляем открытым.
    }
  };

  const columns = useMemo<DataColumn<Project>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortKey: 'name',
        cell: (p) => (
          <Link to={`/projects/${p.id}`} className="font-medium text-fg-primary hover:text-accent">
            {p.name}
          </Link>
        ),
      },
      {
        key: 'direction',
        header: 'Direction',
        cell: (p) => <span className="text-xs text-fg-secondary">{p.direction || '—'}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortKey: 'status',
        cell: (p) => (
          <Chip tone={PROJECT_STATUS_TONES[p.status]} mono>
            {PROJECT_STATUS_LABELS[p.status]}
          </Chip>
        ),
      },
      {
        key: 'dates',
        header: 'Dates',
        cell: (p) => (
          <span className="font-mono text-[11px] text-fg-muted">
            {p.starts_at ?? '—'} → {p.ends_at ?? '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'w-0 whitespace-nowrap',
        cell: (p) => (
          <span className="inline-flex items-center gap-1">
            <Tooltip content="Edit">
              <IconButton aria-label="Edit project" size="sm" onClick={() => openEdit(p)}>
                <Pencil size={13} aria-hidden />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete">
              <IconButton aria-label="Delete project" size="sm" onClick={() => setDeleting(p)}>
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
        <FolderGit2 size={22} aria-hidden className="text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          {hasFilters ? 'No projects match your filters' : 'No projects yet'}
        </p>
        {!hasFilters ? (
          <Button className="mt-2" leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New project
          </Button>
        ) : null}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={'// business projects'}
        actions={
          <Button leftIcon={<Plus size={14} aria-hidden />} onClick={openCreate}>
            New project
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or direction…"
          leftIcon={<Search size={14} aria-hidden />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full sm:w-64"
          aria-label="Search projects"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProjectStatus | '');
            setPage(1);
          }}
          aria-label="Filter by status"
          containerClassName="w-40"
        />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <DataView<Project>
        items={items}
        columns={columns}
        renderCard={(p) => <ProjectCard project={p} onEdit={openEdit} onDelete={setDeleting} />}
        getRowKey={(p) => p.id}
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

      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete project?"
        description={deleting ? `"${deleting.name}" will be removed.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
