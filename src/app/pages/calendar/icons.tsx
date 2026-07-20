const s = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function ChevronLeftIcon() {
  return (
    <svg {...s} aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg {...s} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...s} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SlidersIcon() {
  return (
    <svg {...s} aria-hidden>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}
