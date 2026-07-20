import type { EventInput } from '@fullcalendar/core';
import type {
  Deal,
  Process,
  Project,
  Task,
  UpdateDealInput,
  UpdateProcessInput,
  UpdateProjectInput,
  UpdateTaskInput,
  CalendarEntityType,
} from '@app/api';
import type { NavIconName } from '@app/layout/icons';
import { TASK_STATUS_LABELS } from '../tasks/model';
import { DEAL_STATUS_LABELS, DEFAULT_CURRENCY } from '../deals/model';
import { PROJECT_STATUS_LABELS } from '../projects/model';
import { PROCESS_STATUS_LABELS } from '../processes/model';

/** Режимы календаря: сетка месяца/недели/дня + списочная «Повестка». */
export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda';

export const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'dayGridMonth', label: 'Месяц' },
  { value: 'timeGridWeek', label: 'Неделя' },
  { value: 'timeGridDay', label: 'День' },
  { value: 'agenda', label: 'Повестка' },
];

/** Метаданные слоёв (типов сущностей на сетке) — для легенды и переключателей. */
export const ENTITY_META: Record<CalendarEntityType, { label: string; plural: string }> = {
  task: { label: 'Задача', plural: 'Задачи' },
  deal: { label: 'Сделка', plural: 'Сделки' },
  project: { label: 'Проект', plural: 'Проекты' },
  process: { label: 'Процесс', plural: 'Процессы' },
};

/** Тип сущности → имя иконки навигации (переиспользуем глиф сайдбара). */
export const TYPE_ICON: Record<CalendarEntityType, NavIconName> = {
  task: 'tasks',
  deal: 'deals',
  project: 'projects',
  process: 'processes',
};

/**
 * Тон элемента: фон/текст/акцент — строки CSS-переменных, поэтому цвета «живые»
 * и реагируют на смену темы. Раскраска — по статусу сущности (см. док, п.6).
 */
export type Tone = { bg: string; text: string; accent: string };

const TONES = {
  neutral: { bg: 'var(--bg-2)', text: 'var(--fg-secondary)', accent: 'var(--fg-muted)' },
  muted: { bg: 'var(--bg-2)', text: 'var(--fg-muted)', accent: 'var(--fg-muted)' },
  info: { bg: 'var(--state-info-muted)', text: 'var(--state-info)', accent: 'var(--state-info)' },
  success: { bg: 'var(--state-success-muted)', text: 'var(--state-success)', accent: 'var(--state-success)' },
  warning: { bg: 'var(--state-warning-muted)', text: 'var(--state-warning)', accent: 'var(--state-warning)' },
  error: { bg: 'var(--state-error-muted)', text: 'var(--state-error)', accent: 'var(--state-error)' },
} as const satisfies Record<string, Tone>;

const TASK_TONE: Record<Task['status'], Tone> = {
  TODO: TONES.neutral,
  IN_PROGRESS: TONES.info,
  BLOCKED: TONES.error,
  DONE: TONES.success,
  CANCELLED: TONES.muted,
};
const DEAL_TONE: Record<Deal['status'], Tone> = {
  NEW: TONES.neutral,
  PENDING: TONES.warning,
  WON: TONES.success,
  LOST: TONES.error,
};
const PROJECT_TONE: Record<Project['status'], Tone> = {
  DRAFT: TONES.neutral,
  ACTIVE: TONES.success,
  ON_HOLD: TONES.warning,
  ARCHIVED: TONES.muted,
};
const PROCESS_TONE: Record<Process['status'], Tone> = {
  ACTIVE: TONES.info,
  COMPLETED: TONES.success,
  FAILED: TONES.error,
};

/** Тон по типу+статусу (status — сырое enum-значение). */
export function toneFor(type: CalendarEntityType, status: string): Tone {
  if (type === 'task') return TASK_TONE[status as Task['status']] ?? TONES.neutral;
  if (type === 'deal') return DEAL_TONE[status as Deal['status']] ?? TONES.neutral;
  if (type === 'project') return PROJECT_TONE[status as Project['status']] ?? TONES.neutral;
  return PROCESS_TONE[status as Process['status']] ?? TONES.neutral;
}

/** Человекочитаемый статус по типу (для тултипов/повестки). */
export function statusLabel(type: CalendarEntityType, status: string): string {
  if (type === 'task') return TASK_STATUS_LABELS[status as Task['status']] ?? status;
  if (type === 'deal') return DEAL_STATUS_LABELS[status as Deal['status']] ?? status;
  if (type === 'project') return PROJECT_STATUS_LABELS[status as Project['status']] ?? status;
  return PROCESS_STATUS_LABELS[status as Process['status']] ?? status;
}

// ───────────────────────── Date helpers ─────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date → YYYY-MM-DD (локальные компоненты — совпадает с тем, что видит пользователь). */
export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → значение для <input type="datetime-local"> (локальная зона, до минут). */
export function toLocalDatetime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** YYYY-MM-DD (+ смещение в днях) → YYYY-MM-DD. Считаем в UTC, чтобы не поймать сдвиг зоны. */
export function shiftYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days);
  const nd = new Date(t);
  return `${nd.getUTCFullYear()}-${pad(nd.getUTCMonth() + 1)}-${pad(nd.getUTCDate())}`;
}

// ───────────────────── Сущность → событие FullCalendar ─────────────────────

/**
 * extendedProps каждого события: тип, сырой статус и ПОЛНЫЙ исходный объект.
 * Полный объект нужен для PUT при drag&drop (замена целиком) и для открытия формы.
 */
export type EventMeta =
  | { type: 'task'; status: string; raw: Task }
  | { type: 'deal'; status: string; raw: Deal }
  | { type: 'project'; status: string; raw: Project }
  | { type: 'process'; status: string; raw: Process };

function baseEvent(type: CalendarEntityType, id: string, status: string): Partial<EventInput> {
  const tone = toneFor(type, status);
  return {
    id: `${type}:${id}`,
    backgroundColor: tone.bg,
    borderColor: tone.bg,
    textColor: tone.text,
  };
}

/** Задача → событие с временем (due_at). Возвращает null, если срок не задан. */
export function taskToEvent(t: Task): EventInput | null {
  if (!t.due_at) return null;
  const meta: EventMeta = { type: 'task', status: t.status, raw: t };
  return {
    ...baseEvent('task', t.id, t.status),
    title: t.title,
    start: t.due_at,
    allDay: false,
    editable: true,
    durationEditable: false,
    extendedProps: meta,
  };
}

/** Сделка → «весь день» на дату закрытия. Возвращает null, если дата не задана. */
export function dealToEvent(d: Deal): EventInput | null {
  if (!d.expected_close_at) return null;
  const meta: EventMeta = { type: 'deal', status: d.status, raw: d };
  return {
    ...baseEvent('deal', d.id, d.status),
    title: d.title,
    start: d.expected_close_at,
    allDay: true,
    editable: true,
    durationEditable: false,
    extendedProps: meta,
  };
}

/** Проект → многодневная полоса [starts_at, ends_at]. Null, если обе даты пусты. */
export function projectToEvent(p: Project): EventInput | null {
  if (!p.starts_at && !p.ends_at) return null;
  const start = p.starts_at ?? p.ends_at!;
  // FullCalendar трактует end у all-day событий как ЭКСКЛЮЗИВНЫЙ → добавляем день.
  const end = p.ends_at ? shiftYMD(p.ends_at, 1) : undefined;
  const meta: EventMeta = { type: 'project', status: p.status, raw: p };
  return {
    ...baseEvent('project', p.id, p.status),
    title: p.name,
    start,
    end,
    allDay: true,
    editable: true,
    durationEditable: true,
    extendedProps: meta,
  };
}

/** Процесс → многодневная полоса [starts_at, ends_at]. Null, если обе даты пусты. */
export function processToEvent(p: Process): EventInput | null {
  if (!p.starts_at && !p.ends_at) return null;
  const start = p.starts_at ?? p.ends_at!;
  const end = p.ends_at ? shiftYMD(p.ends_at, 1) : undefined;
  const meta: EventMeta = { type: 'process', status: p.status, raw: p };
  return {
    ...baseEvent('process', p.id, p.status),
    title: p.name,
    start,
    end,
    allDay: true,
    editable: true,
    durationEditable: true,
    extendedProps: meta,
  };
}

// ─────────────── Перенос/растяжение → PUT-payload (полная замена) ───────────────
// Берём исходный объект целиком, патчим только дату; пустые привязки опускаем
// (бэкенд не принимает явный null и отвергает неизвестные поля).

/** Новый due_at (RFC3339) для задачи после переноса. */
export function taskDropInput(raw: Task, newStart: Date): UpdateTaskInput {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    status: raw.status,
    priority: raw.priority,
    attributes: raw.attributes,
    ...(raw.project_id ? { project_id: raw.project_id } : {}),
    ...(raw.client_id ? { client_id: raw.client_id } : {}),
    ...(raw.deal_id ? { deal_id: raw.deal_id } : {}),
    ...(raw.service_id ? { service_id: raw.service_id } : {}),
    ...(raw.process_id ? { process_id: raw.process_id } : {}),
    ...(raw.process_id && raw.process_stage_id ? { process_stage_id: raw.process_stage_id } : {}),
    ...(raw.assigned_to ? { assigned_to: raw.assigned_to } : {}),
    due_at: newStart.toISOString(),
  };
}

/** Новая дата закрытия (YYYY-MM-DD) для сделки после переноса. */
export function dealDropInput(raw: Deal, newStart: Date): UpdateDealInput {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    status: raw.status,
    type: raw.type,
    currency: (raw.currency || DEFAULT_CURRENCY).toUpperCase(),
    attributes: raw.attributes,
    ...(raw.amount !== null ? { amount: raw.amount } : {}),
    ...(raw.probability !== null ? { probability: raw.probability } : {}),
    ...(raw.project_id ? { project_id: raw.project_id } : {}),
    ...(raw.client_id ? { client_id: raw.client_id } : {}),
    ...(raw.service_id ? { service_id: raw.service_id } : {}),
    ...(raw.assigned_to ? { assigned_to: raw.assigned_to } : {}),
    expected_close_at: toYMD(newStart),
  };
}

/**
 * Новые starts_at/ends_at для проекта после переноса/растяжения.
 * `end` — эксклюзивная граница из FullCalendar (переводим обратно в инклюзивную).
 */
export function projectDropInput(raw: Project, start: Date, end: Date | null): UpdateProjectInput {
  const starts_at = toYMD(start);
  const ends_at = end ? shiftYMD(toYMD(end), -1) : raw.ends_at ? starts_at : null;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    direction: raw.direction,
    description: raw.description,
    status: raw.status,
    attributes: raw.attributes,
    starts_at,
    ends_at,
  };
}

/** Новые starts_at/ends_at для процесса после переноса/растяжения (полная замена). */
export function processDropInput(raw: Process, start: Date, end: Date | null): UpdateProcessInput {
  const starts_at = toYMD(start);
  const ends_at = end ? shiftYMD(toYMD(end), -1) : raw.ends_at ? starts_at : null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    attributes: raw.attributes,
    starts_at,
    ends_at,
    ...(raw.project_id ? { project_id: raw.project_id } : {}),
  };
}
