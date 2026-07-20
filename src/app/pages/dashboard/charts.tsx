import { type ReactNode } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  LabelList,
} from 'recharts';
import type { ChartDatum } from './model';
import { formatNumber } from './model';

/** Значение среза: по количеству или по сумме (деньги — только у сделок). */
export type Metric = 'count' | 'amount';

const AXIS_TICK = { fill: 'var(--fg-muted)', fontSize: 11 } as const;

function NoData() {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-fg-muted">
      Нет данных за период
    </div>
  );
}

/** Тултип для среза (пончик/бары): цветная точка + имя + значение. */
function SliceTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
  format: (d: ChartDatum) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
        <span className="text-fg-secondary">{d.name}</span>
        <span className="ml-3 font-mono font-medium text-fg-primary">{format(d)}</span>
      </div>
    </div>
  );
}

/** Пончик по срезу + компактная легенда со значениями. Центр — итог. */
export function Donut({
  data,
  metric = 'count',
  valueFormat = formatNumber,
  totalLabel = 'Всего',
}: {
  data: ChartDatum[];
  metric?: Metric;
  valueFormat?: (v: number) => string;
  totalLabel?: string;
}) {
  const value = (d: ChartDatum) => (metric === 'amount' ? d.amount : d.count);
  const shown = data.filter((d) => value(d) > 0);
  const total = data.reduce((s, d) => s + value(d), 0);
  if (total === 0) return <NoData />;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={shown}
              dataKey={metric}
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={shown.length > 1 ? 2 : 0}
              stroke="var(--bg-1)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {shown.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip format={(d) => valueFormat(value(d))} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums text-fg-primary">
            {valueFormat(total)}
          </span>
          <span className="text-[11px] text-fg-muted">{totalLabel}</span>
        </div>
      </div>

      {/* Легенда — под пончиком на всю ширину карточки: подписи не обрезаются в узких колонках. */}
      <ul className="flex w-full flex-col gap-1.5">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-fg-secondary">{d.name}</span>
            <span className="shrink-0 font-mono tabular-nums text-fg-primary">{valueFormat(value(d))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Горизонтальные бары по срезу (удобно для источников/категорий/исполнителей). */
export function CategoryBars({
  data,
  metric = 'count',
  valueFormat = formatNumber,
}: {
  data: ChartDatum[];
  metric?: Metric;
  valueFormat?: (v: number) => string;
}) {
  const value = (d: ChartDatum) => (metric === 'amount' ? d.amount : d.count);
  const rows = data.filter((d) => value(d) > 0);
  if (rows.length === 0) return <NoData />;
  const height = Math.max(140, rows.length * 40 + 16);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke="var(--border-subtle)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--bg-2)', opacity: 0.5 }}
          content={<SliceTooltip format={(d) => valueFormat(value(d))} />}
        />
        <Bar dataKey={metric} radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={22}>
          {rows.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
          <LabelList
            dataKey={metric}
            position="right"
            formatter={(v) => valueFormat(Number(v))}
            style={{ fill: 'var(--fg-secondary)', fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Воронка продаж: строки с полосой, шириной пропорциональной значению. */
export function FunnelBars({
  data,
  valueFormat = formatNumber,
  amountFormat,
}: {
  data: ChartDatum[];
  valueFormat?: (v: number) => string;
  amountFormat?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <NoData />;

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.key} className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-fg-secondary">{d.name}</span>
            <span className="shrink-0 font-mono tabular-nums text-fg-primary">
              {valueFormat(d.count)}
              {amountFormat && d.amount > 0 ? (
                <span className="ml-2 text-fg-muted">{amountFormat(d.amount)}</span>
              ) : null}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-2">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(2, (d.count / max) * 100)}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Тултип тренда: период + значение. */
function TrendTooltip({
  active,
  payload,
  label,
  color,
  valueFormat,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  color: string;
  valueFormat: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-xs shadow-md">
      <div className="mb-0.5 text-fg-muted">{label}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="font-mono font-medium text-fg-primary">{valueFormat(payload[0]!.value)}</span>
      </div>
    </div>
  );
}

/** Площадной график тренда (timeseries). */
export function TrendChart({
  data,
  color,
  valueFormat = formatNumber,
  gradientId,
}: {
  data: { label: string; value: number }[];
  color: string;
  valueFormat?: (v: number) => string;
  gradientId: string;
}): ReactNode {
  if (data.length === 0) return <NoData />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--border-subtle)' }} minTickGap={16} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => valueFormat(v)}
        />
        <Tooltip content={<TrendTooltip color={color} valueFormat={valueFormat} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={data.length <= 31 ? { r: 2, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
