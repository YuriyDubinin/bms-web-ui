import type { ReactNode } from 'react';

function Glyph({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Glyph>
  );
}

export function TableIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </Glyph>
  );
}

export function CardsIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </Glyph>
  );
}

/** Стрелка сортировки: none — двунаправленная, asc/desc — соответствующая. */
export function SortIcon({ direction }: { direction: 'asc' | 'desc' | 'none' }) {
  if (direction === 'none') {
    return (
      <Glyph size={14}>
        <path d="m8 9 4-5 4 5" />
        <path d="m8 15 4 5 4-5" />
      </Glyph>
    );
  }
  return (
    <Glyph size={14}>
      {direction === 'asc' ? <path d="m6 15 6-6 6 6" /> : <path d="m6 9 6 6 6-6" />}
    </Glyph>
  );
}

export function ChevronLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="m15 18-6-6 6-6" />
    </Glyph>
  );
}

export function ChevronRightIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="m9 18 6-6-6-6" />
    </Glyph>
  );
}

export function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Glyph>
  );
}

export function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="m6 9 6 6 6-6" />
    </Glyph>
  );
}
