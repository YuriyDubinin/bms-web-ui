import type { DealStatus, DealType } from '@app/api';
// Валюты и денежное форматирование переиспользуем из раздела услуг — единый формат по продукту.
export { CURRENCIES, DEFAULT_CURRENCY, formatPrice as formatMoney } from '../services/model';

/** Этапы воронки в порядке движения сделки (для канбана и сортировки). */
export const DEAL_STATUSES: DealStatus[] = ['NEW', 'PENDING', 'WON', 'LOST'];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  NEW: 'Новая',
  PENDING: 'В работе',
  WON: 'Выиграна',
  LOST: 'Проиграна',
};

/**
 * Цветовой тон chip'а этапа (классы токенов). Отражает движение по воронке:
 * серый (новая) → жёлтый (в работе) → зелёный (выиграна) / красный (проиграна).
 */
export const DEAL_STATUS_TONE: Record<DealStatus, string> = {
  NEW: 'bg-bg-2 text-fg-secondary',
  PENDING: 'bg-state-warning-muted text-state-warning',
  WON: 'bg-state-success-muted text-state-success',
  LOST: 'bg-state-error-muted text-state-error',
};

/** Терминальные (закрытые) этапы — для них проставляется closed_at. */
export const CLOSED_STATUSES: DealStatus[] = ['WON', 'LOST'];

export const DEAL_TYPES: DealType[] = ['INCOME', 'EXPENSE'];

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
};

/** Тон chip'а типа: доход — зелёный (приток), расход — оранжевый (отток). */
export const DEAL_TYPE_TONE: Record<DealType, string> = {
  INCOME: 'bg-state-success-muted text-state-success',
  EXPENSE: 'bg-state-warning-muted text-state-warning',
};

/** Вероятность закрытия «60%»; '—' если не задана. */
export function formatProbability(probability: number | null): string {
  return probability === null || probability === undefined ? '—' : `${probability}%`;
}

/** YYYY-MM-DD → DD.MM.YYYY (для expected_close_at); '—' если не задана. */
export function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

/** RFC3339 → локальная дата (для created_at/closed_at). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}
