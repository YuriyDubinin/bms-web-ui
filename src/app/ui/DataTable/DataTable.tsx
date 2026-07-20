import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SelectSearch } from '../SelectSearch';
import type { DataTableColumn, DataTableProps, DataTableView } from './types';
import { cellText, matchesFilters, matchesQuery, sortItems, uniqueValues } from './utils';
import {
  CardsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  SearchIcon,
  SortIcon,
  TableIcon,
} from './icons';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

const SKELETON_ROWS = 6;

/**
 * Универсальная таблица сущностей: два режима (таблица / карточки), глобальный поиск,
 * фильтры по колонкам, сортировка и клиентская пагинация. Generic по типу элемента,
 * вся обработка — по переданному массиву `data` (self-contained).
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  renderCard,
  searchable = true,
  searchPlaceholder = 'Поиск…',
  initialView = 'table',
  allowViewToggle = true,
  pageSize,
  isLoading = false,
  emptyState,
  onRowClick,
  toolbarActions,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [view, setView] = useState<DataTableView>(initialView);
  const [page, setPage] = useState(1);

  const filterColumns = useMemo(() => columns.filter((c) => c.filter && c.value), [columns]);
  const hasSearchable = columns.some((c) => c.searchable !== false && c.value);
  const showSearch = searchable && hasSearchable;
  const hasActiveFilters = search.trim() !== '' || Object.values(filters).some(Boolean);

  // Сброс на первую страницу при изменении условий выборки.
  useEffect(() => {
    setPage(1);
  }, [search, filters, sort]);

  const processed = useMemo(() => {
    const filtered = data.filter(
      (item) => matchesQuery(item, columns, search) && matchesFilters(item, columns, filters),
    );
    return sortItems(filtered, columns, sort);
  }, [data, columns, search, filters, sort]);

  const total = processed.length;
  const totalPages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    if (!pageSize) return processed;
    const start = (safePage - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, pageSize, safePage]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !col.value) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null;
    });
  };

  const resetAll = () => {
    setSearch('');
    setFilters({});
  };

  const renderCell = (col: DataTableColumn<T>, item: T): ReactNode => {
    if (col.cell) return col.cell(item);
    const text = cellText(col.value?.(item));
    return text || <span className="text-fg-muted">—</span>;
  };

  const defaultCard = (item: T): ReactNode => (
    <dl className="flex flex-col gap-2">
      {columns.map((col) => (
        <div key={col.key} className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {col.header}
          </dt>
          <dd className="min-w-0 truncate text-right text-sm text-fg-primary">
            {renderCell(col, item)}
          </dd>
        </div>
      ))}
    </dl>
  );

  const clickableProps = (item: T) =>
    onRowClick
      ? {
          onClick: () => onRowClick(item),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(item);
            }
          },
          role: 'button' as const,
          tabIndex: 0,
        }
      : {};

  // ---- Тулбар ----
  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {showSearch ? (
        <div className="relative w-full sm:w-64">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Поиск по таблице"
            className="w-full rounded-md border border-border-subtle bg-bg-1 py-2 pl-9 pr-3 text-sm text-fg-primary placeholder:text-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted"
          />
        </div>
      ) : null}

      {filterColumns.map((col) => {
        const label =
          col.filterLabel ?? (typeof col.header === 'string' ? col.header : col.key);
        const current = filters[col.key] ?? '';
        if (col.filter === 'text') {
          return (
            <input
              key={col.key}
              type="text"
              value={current}
              onChange={(e) => setFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
              placeholder={label}
              aria-label={`Фильтр: ${label}`}
              className="w-full rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted sm:w-40"
            />
          );
        }
        return (
          <SelectSearch
            key={col.key}
            value={current}
            onChange={(v) => setFilters((prev) => ({ ...prev, [col.key]: v }))}
            ariaLabel={`Фильтр: ${label}`}
            className="w-full sm:w-48"
            searchPlaceholder={`Поиск: ${label}`}
            options={[
              { value: '', label: `${label}: все` },
              ...uniqueValues(data, col).map((v) => ({ value: v, label: v })),
            ]}
          />
        );
      })}

      <div className="flex items-center gap-2 sm:ml-auto">
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CloseIcon />
            Сбросить
          </button>
        ) : null}

        {toolbarActions}

        {allowViewToggle ? (
          <div
            role="radiogroup"
            aria-label="Режим отображения"
            className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-1 p-1"
          >
            {(
              [
                { id: 'table' as const, label: 'Таблица', icon: <TableIcon /> },
                { id: 'cards' as const, label: 'Карточки', icon: <CardsIcon /> },
              ]
            ).map((mode) => {
              const active = view === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={mode.label}
                  title={mode.label}
                  onClick={() => setView(mode.id)}
                  className={cx(
                    'inline-flex h-8 w-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
                  )}
                >
                  {mode.icon}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );

  // ---- Контент ----
  let content: ReactNode;

  if (isLoading) {
    content = (
      <div className="overflow-hidden rounded-lg border border-border-subtle">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border-subtle px-4 py-3.5 last:border-0"
          >
            <div className="h-3 w-1/4 animate-pulse rounded bg-bg-2" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-bg-2" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-bg-2" />
          </div>
        ))}
      </div>
    );
  } else if (data.length === 0) {
    content =
      emptyState ?? (
        <div className="rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-14 text-center text-sm text-fg-secondary">
          Нет данных для отображения
        </div>
      );
  } else if (total === 0) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-14 text-center">
        <p className="text-sm text-fg-secondary">Ничего не найдено по заданным условиям</p>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Сбросить фильтры
        </button>
      </div>
    );
  } else if (view === 'table') {
    content = (
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-1 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-2/60">
              {columns.map((col) => {
                const sortActive = sort?.key === col.key;
                const sortable = !!col.sortable && !!col.value;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      sortActive ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cx(
                      'px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wider text-fg-muted',
                      alignClass[col.align ?? 'left'],
                      col.headerClassName,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={cx(
                          // uppercase дублируем и на кнопке: Preflight сбрасывает text-transform
                          // у <button>, иначе заголовки сортируемых колонок теряют капс из <th>.
                          'inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded',
                          col.align === 'right' && 'flex-row-reverse',
                          sortActive && 'text-fg-primary',
                        )}
                      >
                        <span>{col.header}</span>
                        <SortIcon direction={sortActive ? (sort?.dir ?? 'none') : 'none'} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.map((item) => (
              <tr
                key={getRowId(item)}
                {...clickableProps(item)}
                className={cx(
                  'border-b border-border-subtle last:border-0 transition-colors',
                  onRowClick &&
                    'cursor-pointer hover:bg-bg-2 focus-visible:outline-none focus-visible:bg-bg-2',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cx(
                      'px-4 py-3 align-middle text-fg-secondary',
                      alignClass[col.align ?? 'left'],
                      col.cellClassName,
                    )}
                  >
                    {renderCell(col, item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {paged.map((item) => (
          <div
            key={getRowId(item)}
            {...clickableProps(item)}
            className={cx(
              // min-w-0: grid-трек иначе растягивается по max-content карточки (truncate-заголовок
              // с white-space:nowrap), из-за чего на мобиле карточки вылазят за вьюпорт.
              'min-w-0 rounded-lg border border-border-subtle bg-bg-1 p-4 shadow-sm transition-colors',
              onRowClick &&
                'cursor-pointer hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            {renderCard ? renderCard(item) : defaultCard(item)}
          </div>
        ))}
      </div>
    );
  }

  // ---- Пагинация ----
  const showPagination = !!pageSize && !isLoading && total > pageSize;
  const pagination = showPagination ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-mono text-xs text-fg-muted">Всего: {total}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
          aria-label="Предыдущая страница"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeftIcon />
        </button>
        <span className="font-mono text-xs tabular-nums text-fg-secondary">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
          aria-label="Следующая страница"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      {toolbar}
      {content}
      {pagination}
    </div>
  );
}
