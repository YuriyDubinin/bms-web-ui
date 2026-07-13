import { LayoutGrid, List } from 'lucide-react';
import { cn } from '../lib';

export type ViewMode = 'table' | 'cards';

export type ViewToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
};

const ITEMS: { mode: ViewMode; label: string; icon: typeof List }[] = [
  { mode: 'table', label: 'Table view', icon: List },
  { mode: 'cards', label: 'Cards view', icon: LayoutGrid },
];

/** Сегментированный переключатель режима отображения списка. */
export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn('inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-1 p-0.5', className)}
    >
      {ITEMS.map(({ mode, label, icon: Icon }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(mode)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              active ? 'bg-bg-3 text-fg-primary' : 'text-fg-muted hover:text-fg-secondary',
            )}
          >
            <Icon size={14} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
