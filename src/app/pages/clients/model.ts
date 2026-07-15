import type { Client, ClientStatus } from '@app/api';

export const CLIENT_STATUSES: ClientStatus[] = ['LEAD', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  LEAD: 'Лид',
  ACTIVE: 'Активный',
  INACTIVE: 'Неактивный',
  ARCHIVED: 'В архиве',
};

/**
 * Цветовой тон chip'а статуса (классы токенов). Отражает воронку:
 * LEAD (потенциальный, info) → ACTIVE (действующий, success) → INACTIVE (спящий, warning)
 * → ARCHIVED (архив, приглушённый).
 */
export const CLIENT_STATUS_TONE: Record<ClientStatus, string> = {
  LEAD: 'bg-state-info-muted text-state-info',
  ACTIVE: 'bg-state-success-muted text-state-success',
  INACTIVE: 'bg-state-warning-muted text-state-warning',
  ARCHIVED: 'bg-bg-2 text-fg-muted',
};

/**
 * Отображаемое имя клиента: «Имя Фамилия», иначе название компании, иначе «—».
 * Клиент может быть человеком (ФИО) или компанией (только company_name).
 */
export function clientName(c: Client): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return full || c.company_name || '—';
}

/**
 * Вторичная подпись под именем: компания (если основным именем было ФИО) — чтобы
 * не дублировать, когда клиент — это сама компания. '' если показывать нечего.
 */
export function clientSubtitle(c: Client): string {
  const hasFullName = !!(c.first_name || c.last_name);
  return hasFullName ? c.company_name : '';
}

/**
 * Поля адреса для формы. Адрес — произвольный JSON, но структуру задаём на фронте
 * (рекомендация бэкенда) и придерживаемся единообразия. В API уходит одним объектом.
 */
export type AddressField = { key: string; label: string; placeholder?: string };

export const ADDRESS_FIELDS: AddressField[] = [
  { key: 'country', label: 'Страна', placeholder: 'RU' },
  { key: 'postal_code', label: 'Индекс', placeholder: '125009' },
  { key: 'region', label: 'Регион', placeholder: 'Москва' },
  { key: 'city', label: 'Город', placeholder: 'Москва' },
  { key: 'street', label: 'Улица', placeholder: 'Тверская' },
  { key: 'house', label: 'Дом', placeholder: '1' },
  { key: 'apartment', label: 'Кв./офис', placeholder: '10' },
];

/** Ключ комментария к адресу — рендерится отдельным широким полем. */
export const ADDRESS_COMMENT_KEY = 'comment';

/** Краткий адрес в одну строку для таблицы/карточки; '' если адреса нет. */
export function formatAddress(address: Record<string, unknown> | null): string {
  if (!address) return '';
  const parts = ['city', 'street', 'house']
    .map((k) => address[k])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return parts.join(', ');
}

/** RFC3339 → локальная дата (для created_at/updated_at). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}
