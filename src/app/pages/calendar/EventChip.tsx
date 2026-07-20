import type { EventContentArg } from '@fullcalendar/core';
import { NavGlyph } from '@app/layout/icons';
import { TYPE_ICON, type EventMeta } from './model';

/**
 * Кастомный рендер события (eventContent). Фон/текст берутся из inline-цветов события
 * (тема-реактивные var()), здесь — компактная раскладка: иконка типа + время + заголовок.
 */
export function EventChip({ arg }: { arg: EventContentArg }) {
  const meta = arg.event.extendedProps as EventMeta;
  const strike = meta.type === 'task' && meta.status === 'CANCELLED';

  return (
    <div className="flex min-w-0 items-center gap-1 px-1 py-[1px]">
      <span className="flex shrink-0 items-center opacity-80">
        <NavGlyph name={TYPE_ICON[meta.type]} size={11} />
      </span>
      {arg.timeText ? (
        <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-90">{arg.timeText}</span>
      ) : null}
      <span className={`min-w-0 truncate font-medium${strike ? ' line-through opacity-70' : ''}`}>
        {arg.event.title || 'Без названия'}
      </span>
    </div>
  );
}
