/** Логотип BMS: квадрат с буквой + вордмарк. compact — только квадрат (для свёрнутого сайдбара). */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-sm font-bold text-accent-on"
        aria-hidden
      >
        B
      </span>
      {!compact ? (
        <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-fg-primary">
          BMS
        </span>
      ) : null}
    </span>
  );
}
