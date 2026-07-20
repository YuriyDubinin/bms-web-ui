import { type ReactNode } from 'react';
import { NavGlyph, type NavIconName } from '@app/layout/icons';
import type { FinanceStat } from '@app/api';
import { formatMoney, formatNumber, formatPercent, PERIOD_PRESETS } from './model';

const cx = (...c: (string | false | undefined)[]): string => c.filter(Boolean).join(' ');

/** KPI-плитка: иконка + подпись, крупное число, вспомогательная строка. */
export function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon?: NavIconName;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-1 p-4 shadow-sm">
      <span className="flex items-center gap-2 text-fg-muted">
        {icon ? <NavGlyph name={icon} size={16} /> : null}
        <span className="text-xs">{label}</span>
      </span>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-fg-primary">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

/** Заголовок-карточка для графика: заголовок слева, тулбар справа, контент внутри. */
export function ChartCard({
  title,
  subtitle,
  toolbar,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col rounded-lg border border-border-subtle bg-bg-1 p-5 shadow-sm',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg-primary">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p> : null}
        </div>
        {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Сегментный переключатель (стиль как у переключателя тем). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-2 p-1"
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export type PeriodValue = { preset: string; from?: string; to?: string };

const dateInputClass =
  'rounded-md border border-border-subtle bg-bg-1 px-2.5 py-1.5 text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted';

/** Единый фильтр периода: пресеты + произвольные даты «От/До». Меняет весь дашборд. */
export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}) {
  const setPreset = (key: string, days: number | null) => {
    if (days === null) {
      onChange({ preset: key });
      return;
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onChange({ preset: key, from: fmt(from), to: fmt(to) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-2 p-1">
        {PERIOD_PRESETS.map((p) => {
          const active = value.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key, p.days)}
              className={cx(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="Период с"
          value={value.from ?? ''}
          max={value.to || undefined}
          onChange={(e) => onChange({ preset: 'custom', from: e.target.value || undefined, to: value.to })}
          className={dateInputClass}
        />
        <span className="text-fg-muted">—</span>
        <input
          type="date"
          aria-label="Период по"
          value={value.to ?? ''}
          min={value.from || undefined}
          onChange={(e) => onChange({ preset: 'custom', from: value.from, to: e.target.value || undefined })}
          className={dateInputClass}
        />
      </div>
    </div>
  );
}

/** Финансовая панель по выбранной валюте: доход/расход/чистыми/воронка/прогноз/win-rate. */
export function FinancePanel({ finance }: { finance: FinanceStat }) {
  const c = finance.currency;
  const items: { label: string; value: string; tone?: string; hint?: string }[] = [
    { label: 'Выручка', value: formatMoney(finance.revenue, c), tone: 'text-state-success' },
    { label: 'Расходы', value: formatMoney(finance.expenses, c), tone: 'text-state-warning' },
    { label: 'Чистыми', value: formatMoney(finance.net, c) },
    { label: 'Воронка (открыто)', value: formatMoney(finance.pipeline, c) },
    { label: 'Взвеш. прогноз', value: formatMoney(finance.weighted_pipeline, c) },
    {
      label: 'Win-rate',
      value: formatPercent(finance.win_rate),
      hint: `${formatNumber(finance.won_count)} won · ${formatNumber(finance.lost_count)} lost`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-border-subtle bg-bg-1 p-4 shadow-sm">
          <p className="text-xs text-fg-muted">{it.label}</p>
          <p className={cx('mt-1.5 font-mono text-lg font-semibold tabular-nums', it.tone ?? 'text-fg-primary')}>
            {it.value}
          </p>
          {it.hint ? <p className="mt-0.5 truncate text-[11px] text-fg-muted">{it.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
