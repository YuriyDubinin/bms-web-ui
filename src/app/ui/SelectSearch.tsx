import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export type SelectOption = { value: string; label: string };

export type SelectSearchProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** id триггера — на него ссылается <label htmlFor>. */
  id?: string;
  /** Текст, когда выбранное значение не найдено среди опций. */
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  /** Показывать ли поле поиска. По умолчанию — во всех списках, где больше одного варианта. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Доступное имя, если рядом нет <label>. */
  ariaLabel?: string;
  className?: string;
};

function triggerClass(hasError: boolean): string {
  return cx(
    'flex w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-bg-1 px-3 py-2 text-left text-sm',
    'transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-state-error focus:border-state-error focus:ring-state-error-muted'
      : 'border-border-subtle focus:border-accent focus:ring-accent-muted',
  );
}

function ChevronIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-fg-muted">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Выпадающий список с поиском — замена нативному <select> для форм и фильтров.
 * Если вариантов больше одного (или задан явный `searchable`), сверху показывается поле
 * поиска, которое фильтрует опции по подстроке. Поддерживает клавиатуру (стрелки/Enter/Escape), закрытие
 * по клику вне и ARIA (combobox + listbox). Значением владеет родитель (controlled).
 */
export function SelectSearch({
  value,
  onChange,
  options,
  id,
  placeholder,
  disabled = false,
  hasError = false,
  searchable,
  searchPlaceholder = 'Поиск…',
  ariaLabel,
  className,
}: SelectSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const showSearch = searchable ?? options.length > 1;
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  // Закрытие по клику вне компонента.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // При открытии: сбрасываем поиск, ставим активной выбранную опцию, фокусируем поиск.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    if (showSearch) {
      const raf = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сброс активного индекса при изменении поиска.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Держим активную опцию в зоне видимости при навигации клавиатурой.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (v: string) => {
    onChange(v);
    close();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) choose(opt.value);
    }
  };

  return (
    <div ref={rootRef} className={cx('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
          } else {
            handleKeyDown(e);
          }
        }}
        className={triggerClass(hasError)}
      >
        <span className={cx('truncate', !selected && 'text-fg-muted')}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        <ChevronIcon />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-md border border-border-subtle bg-bg-1 shadow-md">
          {showSearch ? (
            <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2 text-fg-muted">
              <SearchIcon />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 bg-transparent text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none"
              />
            </div>
          ) : null}

          <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-fg-muted">Ничего не найдено</li>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => choose(o.value)}
                    className={cx(
                      'flex cursor-pointer items-center justify-between gap-2 rounded px-3 py-2 text-sm transition-colors',
                      i === activeIndex ? 'bg-bg-2' : '',
                      isSelected ? 'font-medium text-accent' : 'text-fg-primary',
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSelected ? <CheckIcon /> : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
