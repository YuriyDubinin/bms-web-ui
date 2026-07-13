import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import type { ViewMode } from './ViewToggle';

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  /** Если задан и передан onSortChange — заголовок кликабелен (server-sort). */
  sortKey?: string;
  align?: 'left' | 'right' | 'center';
  headerClassName?: string;
  cellClassName?: string;
};

export type DataViewSort = { by: string; order: 'asc' | 'desc' };

export type DataViewProps<T> = {
  items: T[];
  columns: DataColumn<T>[];
  renderCard: (item: T) => ReactNode;
  getRowKey: (item: T) => string;
  view: ViewMode;
  isLoading?: boolean;
  skeletonCount?: number;
  empty?: ReactNode;
  sort?: DataViewSort;
  onSortChange?: (sortKey: string) => void;
  onRowClick?: (item: T) => void;
  cardsClassName?: string;
  className?: string;
};

const alignClass: Record<NonNullable<DataColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-border-subtle">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className="h-3 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function CardsSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-4 h-3 w-1/2" />
        </Card>
      ))}
    </div>
  );
}

/**
 * Переиспользуемый компонент отображения коллекции: таблица (table) или карточки (cards).
 * Generic по типу элемента. Сортировка/пагинация — server-side, наружу через колбэки.
 */
export function DataView<T>({
  items,
  columns,
  renderCard,
  getRowKey,
  view,
  isLoading = false,
  skeletonCount = 6,
  empty,
  sort,
  onSortChange,
  onRowClick,
  cardsClassName,
  className,
}: DataViewProps<T>) {
  // Первичная загрузка без данных → skeleton.
  if (isLoading && items.length === 0) {
    return (
      <div className={className}>
        {view === 'table' ? (
          <div className="overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full">
              <TableSkeleton columns={columns.length} rows={skeletonCount} />
            </table>
          </div>
        ) : (
          <CardsSkeleton count={skeletonCount} className={cardsClassName} />
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return <div className={className}>{empty}</div>;
  }

  if (view === 'cards') {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', cardsClassName, className)}>
        {items.map((item) => (
          <div key={getRowKey(item)}>{renderCard(item)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-md border border-border-subtle', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-bg-1">
            {columns.map((col) => {
              const isSorted = sort && col.sortKey && sort.by === col.sortKey;
              const sortable = !!col.sortKey && !!onSortChange;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-wider text-fg-muted',
                    alignClass[col.align ?? 'left'],
                    col.headerClassName,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.sortKey as string)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-fg-secondary',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm',
                        isSorted && 'text-fg-secondary',
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sort?.order === 'asc' ? (
                          <ChevronUp size={12} aria-hidden className="text-accent" />
                        ) : (
                          <ChevronDown size={12} aria-hidden className="text-accent" />
                        )
                      ) : null}
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
          {items.map((item) => (
            <tr
              key={getRowKey(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'border-t border-border-subtle transition-colors',
                onRowClick && 'cursor-pointer hover:bg-bg-1',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-3 text-sm text-fg-secondary align-middle',
                    alignClass[col.align ?? 'left'],
                    col.cellClassName,
                  )}
                >
                  {col.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
