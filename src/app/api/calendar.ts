import { api } from './client';

/** Типы сущностей, которые ложатся на календарь (имеют собственную дату). */
export type CalendarEntityType = 'task' | 'deal' | 'project' | 'process';

/**
 * Унифицированный элемент повестки из GET /calendar/agenda — единый вид задачи/сделки/проекта.
 * `status` — сырое enum-значение соответствующей сущности (набор зависит от type).
 */
export type AgendaItem = {
  type: CalendarEntityType;
  id: string;
  title: string;
  /** Начало, RFC3339 (для дат — полночь UTC). */
  start: string;
  /** Конец, RFC3339, или null (у задач/сделок конца нет; есть у проектов). */
  end: string | null;
  /** true → «весь день/период» (сделки, проекты); false → элемент с временем (задачи). */
  all_day: boolean;
  status: string;
};

export type AgendaParams = {
  /** Нижняя граница окна, YYYY-MM-DD или RFC3339. */
  from?: string;
  /** Верхняя граница окна (для даты-без-времени трактуется как конец дня). */
  to?: string;
  /** Какие типы вернуть; по умолчанию — все три. */
  types?: CalendarEntityType[];
};

type AgendaResponse = { items: AgendaItem[] };

/** Как и списки задач/сделок, агрегатор на «холодном» бэкенде может отвечать дольше 20с. */
const CALENDAR_TIMEOUT_MS = 45_000;

/**
 * GET /calendar/agenda — все датированные сущности окна одним запросом.
 * Возвращает плоский массив элементов (разворачивает { items }).
 */
export function getCalendarAgenda(
  token: string,
  params: AgendaParams = {},
  signal?: AbortSignal,
): Promise<AgendaItem[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.types && params.types.length > 0) qs.set('types', params.types.join(','));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return api
    .get<AgendaResponse>(`/calendar/agenda${query}`, { token, signal, timeoutMs: CALENDAR_TIMEOUT_MS })
    .then((res) => res.items ?? []);
}
