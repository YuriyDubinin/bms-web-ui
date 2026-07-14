import type { ReactNode } from 'react';
import { ThemeSwitcher, useTheme, THEMES } from '@app/theme';

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={[
        'rounded-lg border border-border-subtle bg-bg-1 p-5 shadow-sm transition-colors duration-300',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: 'accent' | 'success' | 'warning' | 'info'; children: ReactNode }) {
  const tones: Record<typeof tone, string> = {
    accent: 'bg-accent-muted text-accent',
    success: 'bg-state-success-muted text-state-success',
    warning: 'bg-state-warning-muted text-state-warning',
    info: 'bg-state-info-muted text-state-info',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const KPIS = [
  { label: 'Выручка / мес', value: '₽ 4 812 900', sub: 'За последние 30 дней', chip: <Chip tone="success">+12.4%</Chip> },
  { label: 'Активные сделки', value: '128', sub: 'В работе у команды', chip: <Chip tone="info">24 новых</Chip> },
  { label: 'Задачи', value: '37', sub: 'Открыто на сегодня', chip: <Chip tone="warning">6 просрочено</Chip> },
];

const ACTIVITY = [
  { name: 'Договор №2481 — ООО «Ориент»', chip: <Chip tone="success">Активен</Chip> },
  { name: 'Заявка на интеграцию API', chip: <Chip tone="warning">В ожидании</Chip> },
  { name: 'Аудит безопасности Q3', chip: <Chip tone="info">Запланирован</Chip> },
  { name: 'Онбординг клиента «Северсталь»', chip: <Chip tone="accent">В процессе</Chip> },
];

export function App() {
  const { theme, setTheme } = useTheme();
  const activeLabel = THEMES.find((t) => t.id === theme)?.label ?? '';

  return (
    <div className="min-h-screen bg-bg-0 text-fg-primary transition-colors duration-300">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
        {/* Хедер: бренд + переключатель тем */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-fg-muted">BMS</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Business Management Suite
            </h1>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Единая платформа для оптимизации бизнес-процессов
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <ThemeSwitcher value={theme} onChange={setTheme} />
            <span className="font-mono text-[11px] text-fg-muted">Тема: {activeLabel}</span>
          </div>
        </header>

        <div className="my-8 h-px bg-border-subtle transition-colors duration-300" />

        {/* KPI-карточки */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KPIS.map((kpi) => (
            <Card key={kpi.label}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                  {kpi.label}
                </span>
                {kpi.chip}
              </div>
              <p className="mt-3 font-mono text-[28px] font-semibold tabular-nums tracking-tight">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-fg-secondary">{kpi.sub}</p>
            </Card>
          ))}
        </div>

        {/* Текст + действия и лента активности */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col lg:col-span-2">
            <h2 className="text-base font-semibold">Дизайн-система BMS</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
              Строгая, современная и удобная основа для серьёзного продукта. Единый набор
              токенов обеспечивает читаемую иерархию: <span className="text-fg-primary">основной</span>,
              вторичный и <span className="text-fg-muted">приглушённый</span> текст — во всех четырёх
              темах без потери контраста.
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-on transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-1"
              >
                Основное действие
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-transparent px-3.5 py-2 text-sm font-medium text-fg-secondary transition-colors duration-150 hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Отмена
              </button>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                Активность
              </span>
            </div>
            <div className="flex flex-col divide-y divide-border-subtle">
              {ACTIVITY.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="truncate text-sm">{row.name}</span>
                  <span className="shrink-0">{row.chip}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <footer className="mt-10 font-mono text-[11px] text-fg-muted">
          BMS © {new Date().getFullYear()} — предпросмотр стилевой системы
        </footer>
      </div>
    </div>
  );
}
