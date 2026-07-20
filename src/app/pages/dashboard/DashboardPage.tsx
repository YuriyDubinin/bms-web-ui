import { useMemo, useState, type ReactNode } from 'react';
import { SelectSearch } from '@app/ui';
import { useDashboard, useTimeseries } from './useDashboard';
import { PeriodFilter, StatTile, ChartCard, Segmented, FinancePanel, type PeriodValue } from './components';
import { Donut, CategoryBars, FunnelBars, TrendChart } from './charts';
import {
  dealStatusData,
  dealTypeData,
  clientStatusData,
  clientSubjectData,
  taskStatusData,
  taskPriorityData,
  projectStatusData,
  serviceStatusData,
  processStatusData,
  freeBucketsToData,
  formatNumber,
  formatMoney,
  TIMESERIES_METRICS,
  INTERVAL_OPTIONS,
  formatPeriodLabel,
} from './model';
import type { TimeseriesInterval, TimeseriesMetric } from '@app/api';

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-2 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-muted">
      {children}
    </h2>
  );
}

/** Скелетон первичной загрузки. */
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border-subtle bg-bg-1" />
        ))}
      </div>
      <div className="mt-4 h-72 rounded-lg border border-border-subtle bg-bg-1" />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-lg border border-border-subtle bg-bg-1" />
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>({ preset: 'all' });
  const statsPeriod = useMemo(() => ({ from: period.from, to: period.to }), [period.from, period.to]);
  const { data, isLoading, error, reload } = useDashboard(statsPeriod);

  const { summary, deals, clients, tasks, projects, services, processes } = data;

  // Валюта: список из summary.finance; селектор — если валют больше одной.
  const currencies = useMemo(() => summary?.finance.map((f) => f.currency) ?? [], [summary]);
  const [currency, setCurrency] = useState('');
  const activeFinance =
    summary?.finance.find((f) => f.currency === currency) ?? summary?.finance[0] ?? null;
  const activeCurrency = activeFinance?.currency;
  const money = (v: number) => (activeCurrency ? formatMoney(v, activeCurrency) : formatNumber(v));

  // Тренд (timeseries).
  const [metric, setMetric] = useState<TimeseriesMetric>('revenue');
  const [granularity, setGranularity] = useState<TimeseriesInterval>('month');
  const metricMeta = TIMESERIES_METRICS.find((m) => m.metric === metric);
  const isMoneyMetric = !!metricMeta?.money;
  const ts = useTimeseries({
    metric,
    interval: granularity,
    currency: isMoneyMetric ? activeCurrency : undefined,
    from: period.from,
    to: period.to,
  });
  const trendData = (ts.data?.points ?? []).map((p) => ({
    label: formatPeriodLabel(p.period, granularity),
    value: p.value,
  }));
  const trendColor =
    metric === 'revenue' ? 'var(--state-success)' : metric === 'expenses' ? 'var(--state-error)' : 'var(--accent)';
  const trendFormat = isMoneyMetric ? money : formatNumber;

  const loadingInitial = isLoading && !summary;

  return (
    <>
      {/* Заголовок + единый фильтр периода */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Дашборд</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-fg-secondary">
            Статистика и аналитика по проекту
            {isLoading && summary ? <span className="text-xs text-fg-muted">· обновление…</span> : null}
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-state-error-muted px-4 py-3 text-sm text-state-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded px-2 py-1 font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-error"
          >
            Повторить
          </button>
        </div>
      ) : null}

      {loadingInitial ? (
        <Skeleton />
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI-плитки */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile
              icon="clients"
              label="Клиенты"
              value={formatNumber(summary?.clients.total ?? 0)}
              hint={`${formatNumber(summary?.clients.active ?? 0)} активных · ${formatNumber(summary?.clients.leads ?? 0)} лидов`}
            />
            <StatTile
              icon="deals"
              label="Сделки"
              value={formatNumber(summary?.deals.total ?? 0)}
              hint={`${formatNumber(summary?.deals.open ?? 0)} открыто · ${formatNumber(summary?.deals.won ?? 0)} выиграно`}
            />
            <StatTile
              icon="tasks"
              label="Задачи"
              value={formatNumber(summary?.tasks.total ?? 0)}
              hint={
                <>
                  {formatNumber(summary?.tasks.open ?? 0)} открыто ·{' '}
                  {(summary?.tasks.overdue ?? 0) > 0 ? (
                    <span className="text-state-error">{formatNumber(summary?.tasks.overdue ?? 0)} просрочено</span>
                  ) : (
                    <>0 просрочено</>
                  )}
                </>
              }
            />
            <StatTile
              icon="processes"
              label="Процессы"
              value={formatNumber(summary?.processes.total ?? 0)}
              hint={`${formatNumber(summary?.processes.active ?? 0)} активных · ${formatNumber(summary?.processes.completed ?? 0)} завершено`}
            />
            <StatTile
              icon="projects"
              label="Проекты"
              value={formatNumber(summary?.projects.total ?? 0)}
              hint={`${formatNumber(summary?.projects.active ?? 0)} активных`}
            />
            <StatTile
              icon="services"
              label="Услуги"
              value={formatNumber(summary?.services.total ?? 0)}
              hint={`${formatNumber(summary?.services.active ?? 0)} активных`}
            />
            <StatTile
              label="Сотрудники"
              value={formatNumber(summary?.users.total ?? 0)}
              hint="операторы организации"
            />
          </div>

          {/* Финансы по выбранной валюте */}
          {activeFinance ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionLabel>Финансы{activeCurrency ? ` · ${activeCurrency}` : ''}</SectionLabel>
                {currencies.length > 1 ? (
                  <SelectSearch
                    value={activeCurrency ?? ''}
                    onChange={setCurrency}
                    ariaLabel="Валюта"
                    className="w-36"
                    options={currencies.map((c) => ({ value: c, label: c }))}
                  />
                ) : null}
              </div>
              <FinancePanel finance={activeFinance} />
            </div>
          ) : null}

          {/* Динамика (тренд) */}
          <ChartCard
            title="Динамика"
            subtitle="Тренд выбранной метрики по времени"
            toolbar={
              <>
                <div className="w-52">
                  <SelectSearch
                    value={metric}
                    onChange={(v) => setMetric(v as TimeseriesMetric)}
                    ariaLabel="Метрика"
                    options={TIMESERIES_METRICS.map((m) => ({ value: m.metric, label: m.label }))}
                  />
                </div>
                <Segmented
                  value={granularity}
                  onChange={setGranularity}
                  ariaLabel="Гранулярность"
                  options={INTERVAL_OPTIONS}
                />
              </>
            }
          >
            {ts.error ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-state-error">
                {ts.error}
              </div>
            ) : (
              <TrendChart data={trendData} color={trendColor} valueFormat={trendFormat} gradientId="trend-area" />
            )}
          </ChartCard>

          {/* Продажи */}
          <div>
            <SectionLabel>Продажи</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ChartCard title="Воронка продаж" subtitle="По стадиям сделки">
                <FunnelBars
                  data={dealStatusData(deals?.by_status ?? [])}
                  valueFormat={formatNumber}
                  amountFormat={money}
                />
              </ChartCard>
              <ChartCard title="Доход и расход" subtitle="Сумма по типу сделки">
                <Donut data={dealTypeData(deals?.by_type ?? [])} metric="amount" valueFormat={money} totalLabel="Оборот" />
              </ChartCard>
              <ChartCard title="Сделки по ответственным" subtitle="Количество сделок">
                <CategoryBars data={freeBucketsToData(deals?.by_assignee ?? [], 'Не назначено')} />
              </ChartCard>
            </div>
          </div>

          {/* Клиенты */}
          <div>
            <SectionLabel>Клиенты</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ChartCard title="Клиенты по статусу">
                <Donut data={clientStatusData(clients?.by_status ?? [])} />
              </ChartCard>
              <ChartCard title="Физлица и юрлица">
                <Donut data={clientSubjectData(clients?.by_subject_type ?? [])} />
              </ChartCard>
              <ChartCard title="Источники привлечения">
                <CategoryBars data={freeBucketsToData(clients?.by_source ?? [], 'Не указан')} />
              </ChartCard>
            </div>
          </div>

          {/* Задачи */}
          <div>
            <SectionLabel>Задачи</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ChartCard title="Задачи по статусу">
                <Donut data={taskStatusData(tasks?.by_status ?? [])} />
              </ChartCard>
              <ChartCard title="По приоритету">
                <Donut data={taskPriorityData(tasks?.by_priority ?? [])} />
              </ChartCard>
              <ChartCard title="Задачи по исполнителям" subtitle="Количество задач">
                <CategoryBars data={freeBucketsToData(tasks?.by_assignee ?? [], 'Не назначено')} />
              </ChartCard>
            </div>
          </div>

          {/* Ресурсы */}
          <div>
            <SectionLabel>Проекты, услуги и процессы</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ChartCard title="Проекты по статусу">
                <Donut data={projectStatusData(projects?.by_status ?? [])} />
              </ChartCard>
              <ChartCard title="Услуги по статусу">
                <Donut data={serviceStatusData(services?.by_status ?? [])} />
              </ChartCard>
              <ChartCard title="Процессы по статусу">
                <Donut data={processStatusData(processes?.by_status ?? [])} />
              </ChartCard>
              <ChartCard title="Услуги по категориям" className="md:col-span-2 xl:col-span-3">
                <CategoryBars data={freeBucketsToData(services?.by_category ?? [], 'Без категории')} />
              </ChartCard>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
