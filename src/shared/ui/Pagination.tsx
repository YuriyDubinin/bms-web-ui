import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib';
import { IconButton } from './IconButton';

export type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <span className="font-mono text-[11px] text-fg-muted">
        {total} item{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <IconButton
          aria-label="Previous page"
          size="sm"
          variant="secondary"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(page - 1)}
        >
          <ChevronLeft size={14} aria-hidden />
        </IconButton>
        <span className="font-mono text-xs tabular-nums text-fg-secondary">
          {page} <span className="text-fg-muted">/ {Math.max(totalPages, 1)}</span>
        </span>
        <IconButton
          aria-label="Next page"
          size="sm"
          variant="secondary"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(page + 1)}
        >
          <ChevronRight size={14} aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
