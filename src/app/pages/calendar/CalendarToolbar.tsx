import { useState, type ReactNode } from 'react';
import type { CalendarEntityType, Project, User } from '@app/api';
import { Button, SelectSearch } from '@app/ui';
import { NavGlyph } from '@app/layout/icons';
import { ENTITY_META, VIEW_OPTIONS, TYPE_ICON, type CalendarView } from './model';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SlidersIcon } from './icons';
import type { CalendarFilters } from './useCalendar';
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '../tasks/model';
import { DEAL_STATUSES, DEAL_STATUS_LABELS, DEAL_TYPES, DEAL_TYPE_LABELS } from '../deals/model';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../projects/model';
import { PROCESS_STATUSES, PROCESS_STATUS_LABELS } from '../processes/model';

const cx = (...c: (string | false | undefined)[]): string => c.filter(Boolean).join(' ');

// Порядок слоёв — как у разделов в сайдбаре: Проекты · Сделки · Задачи · Процессы.
const LAYER_ORDER: CalendarEntityType[] = ['project', 'deal', 'task', 'process'];

function ViewSwitch({ view, onView }: { view: CalendarView; onView: (v: CalendarView) => void }) {
  return (
    <div role="radiogroup" aria-label="Режим" className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-2 p-1">
      {VIEW_OPTIONS.map((o) => {
        const active = view === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onView(o.value)}
            className={cx(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
              // «Неделя» на узком экране нечитаема (7 колонок timeGrid) — прячем на мобильном.
              o.value === 'timeGridWeek' && 'max-sm:hidden',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

/** Опции селекта: «Все» + значения. */
function opts<T extends string>(values: readonly T[], labels: Record<T, string>, allLabel = 'Все') {
  return [{ value: '', label: allLabel }, ...values.map((v) => ({ value: v, label: labels[v] }))];
}

export type CalendarToolbarProps = {
  title: string;
  view: CalendarView;
  onView: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  filters: CalendarFilters;
  onChange: (patch: Partial<CalendarFilters>) => void;
  users: User[];
  projects: Project[];
  onCreate: () => void;
  isLoading: boolean;
};

export function CalendarToolbar({
  title,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  filters,
  onChange,
  users,
  projects,
  onCreate,
  isLoading,
}: CalendarToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { layers } = filters;

  const activeCount = [
    filters.projectId,
    filters.assignedTo,
    filters.taskStatus,
    filters.taskPriority,
    filters.dealStatus,
    filters.dealType,
    filters.projectStatus,
    filters.processStatus,
  ].filter(Boolean).length;

  const allActive = layers.task && layers.deal && layers.project && layers.process;
  const toggleLayer = (t: CalendarEntityType) =>
    onChange({ layers: { ...layers, [t]: !layers[t] } });

  const resetFilters = () =>
    onChange({
      projectId: '',
      assignedTo: '',
      taskStatus: '',
      taskPriority: '',
      dealStatus: '',
      dealType: '',
      projectStatus: '',
      processStatus: '',
    });

  const showTaskDeal = layers.task || layers.deal;

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Строка 1: навигация + заголовок · вид + создать */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <NavButton label="Назад" onClick={onPrev}>
              <ChevronLeftIcon />
            </NavButton>
            <NavButton label="Вперёд" onClick={onNext}>
              <ChevronRightIcon />
            </NavButton>
          </div>
          <button
            type="button"
            onClick={onToday}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:bg-bg-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Сегодня
          </button>
          <h2 className="ml-1 min-w-0 truncate text-base font-semibold capitalize text-fg-primary sm:text-lg">
            {title}
          </h2>
          {isLoading ? <span className="text-xs text-fg-muted">· обновление…</span> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ViewSwitch view={view} onView={onView} />
          <Button size="sm" leftIcon={<PlusIcon />} onClick={onCreate}>
            Создать
          </Button>
        </div>
      </div>

      {/* Строка 2: слои + кнопка фильтров */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={allActive}
            onClick={() => onChange({ layers: { task: true, deal: true, project: true, process: true } })}
            className={cx(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              allActive
                ? 'border-accent bg-accent-muted text-accent'
                : 'border-border-subtle text-fg-muted hover:text-fg-secondary',
            )}
          >
            Все
          </button>
          {LAYER_ORDER.map((t) => {
            const active = layers[t];
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLayer(t)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  active
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border-subtle text-fg-muted hover:text-fg-secondary',
                )}
              >
                <NavGlyph name={TYPE_ICON[t]} size={13} />
                {ENTITY_META[t].plural}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            filtersOpen || activeCount > 0
              ? 'border-accent bg-accent-muted text-accent'
              : 'border-border-subtle text-fg-secondary hover:bg-bg-2 hover:text-fg-primary',
          )}
        >
          <SlidersIcon />
          Фильтры
          {activeCount > 0 ? (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-on">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Панель фильтров */}
      {filtersOpen ? (
        <div className="animate-fade-in-up rounded-lg border border-border-subtle bg-bg-1 p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {showTaskDeal ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Проект</span>
                <SelectSearch
                  value={filters.projectId}
                  onChange={(v) => onChange({ projectId: v })}
                  ariaLabel="Проект"
                  placeholder="Все проекты"
                  searchPlaceholder="Поиск проекта…"
                  options={[{ value: '', label: 'Все проекты' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
                />
              </label>
            ) : null}
            {showTaskDeal ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Исполнитель</span>
                <SelectSearch
                  value={filters.assignedTo}
                  onChange={(v) => onChange({ assignedTo: v })}
                  ariaLabel="Исполнитель"
                  placeholder="Все"
                  searchPlaceholder="Поиск сотрудника…"
                  options={[{ value: '', label: 'Все' }, ...users.map((u) => ({ value: u.id, label: u.full_name || u.email }))]}
                />
              </label>
            ) : null}
            {layers.task ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Статус задачи</span>
                <SelectSearch
                  value={filters.taskStatus}
                  onChange={(v) => onChange({ taskStatus: v as CalendarFilters['taskStatus'] })}
                  ariaLabel="Статус задачи"
                  options={opts(TASK_STATUSES, TASK_STATUS_LABELS)}
                />
              </label>
            ) : null}
            {layers.task ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Приоритет</span>
                <SelectSearch
                  value={filters.taskPriority}
                  onChange={(v) => onChange({ taskPriority: v as CalendarFilters['taskPriority'] })}
                  ariaLabel="Приоритет"
                  options={opts(TASK_PRIORITIES, TASK_PRIORITY_LABELS)}
                />
              </label>
            ) : null}
            {layers.deal ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Статус сделки</span>
                <SelectSearch
                  value={filters.dealStatus}
                  onChange={(v) => onChange({ dealStatus: v as CalendarFilters['dealStatus'] })}
                  ariaLabel="Статус сделки"
                  options={opts(DEAL_STATUSES, DEAL_STATUS_LABELS)}
                />
              </label>
            ) : null}
            {layers.deal ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Тип сделки</span>
                <SelectSearch
                  value={filters.dealType}
                  onChange={(v) => onChange({ dealType: v as CalendarFilters['dealType'] })}
                  ariaLabel="Тип сделки"
                  options={opts(DEAL_TYPES, DEAL_TYPE_LABELS)}
                />
              </label>
            ) : null}
            {layers.project ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Статус проекта</span>
                <SelectSearch
                  value={filters.projectStatus}
                  onChange={(v) => onChange({ projectStatus: v as CalendarFilters['projectStatus'] })}
                  ariaLabel="Статус проекта"
                  options={opts(PROJECT_STATUSES, PROJECT_STATUS_LABELS)}
                />
              </label>
            ) : null}
            {layers.process ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-secondary">Статус процесса</span>
                <SelectSearch
                  value={filters.processStatus}
                  onChange={(v) => onChange({ processStatus: v as CalendarFilters['processStatus'] })}
                  ariaLabel="Статус процесса"
                  options={opts(PROCESS_STATUSES, PROCESS_STATUS_LABELS)}
                />
              </label>
            ) : null}
          </div>
          {activeCount > 0 ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg-secondary hover:underline"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
