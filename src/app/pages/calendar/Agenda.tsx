import { useMemo } from 'react';
import type { AgendaItem } from '@app/api';
import { NavGlyph } from '@app/layout/icons';
import { ENTITY_META, statusLabel, toYMD, toneFor, TYPE_ICON } from './model';

const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

type Group = { day: string; label: string; isToday: boolean; items: AgendaItem[] };

/**
 * Режим «Повестка»: единый список датированных сущностей окна (данные из /calendar/agenda),
 * сгруппированный по дням. Клик по элементу уводит к его дате в сетке (там же редактирование).
 */
export function Agenda({
  items,
  isLoading,
  error,
  onItemClick,
}: {
  items: AgendaItem[];
  isLoading: boolean;
  error: string | null;
  onItemClick: (item: AgendaItem) => void;
}) {
  const groups = useMemo<Group[]>(() => {
    const today = toYMD(new Date());
    const byDay = new Map<string, AgendaItem[]>();
    for (const it of items) {
      const day = toYMD(new Date(it.start));
      const bucket = byDay.get(day);
      if (bucket) bucket.push(it);
      else byDay.set(day, [it]);
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, list]) => ({
        day,
        label: dayFmt.format(new Date(`${day}T00:00:00`)),
        isToday: day === today,
        items: list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
      }));
  }, [items]);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg border border-border-subtle bg-bg-1" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md bg-state-error-muted px-4 py-3 text-sm text-state-error">{error}</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-1 px-6 py-16 text-center text-sm text-fg-secondary">
        Нет событий в выбранном окне
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.day} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-semibold capitalize ${g.isToday ? 'text-accent' : 'text-fg-primary'}`}>
              {g.label}
            </h3>
            {g.isToday ? (
              <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent">
                сегодня
              </span>
            ) : null}
            <span className="text-xs text-fg-muted">· {g.items.length}</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {g.items.map((it) => {
              const tone = toneFor(it.type, it.status);
              return (
                <li key={`${it.type}:${it.id}`}>
                  <button
                    type="button"
                    onClick={() => onItemClick(it)}
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ background: tone.accent }}
                      aria-hidden
                    />
                    <span className="flex shrink-0 items-center text-fg-muted">
                      <NavGlyph name={TYPE_ICON[it.type]} size={15} />
                    </span>
                    {!it.all_day ? (
                      <span className="shrink-0 font-mono text-xs tabular-nums text-fg-secondary">
                        {timeFmt.format(new Date(it.start))}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg-primary">
                      {it.title || 'Без названия'}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: tone.bg, color: tone.text }}
                    >
                      {statusLabel(it.type, it.status)}
                    </span>
                    <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">
                      {ENTITY_META[it.type].label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
