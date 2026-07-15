import type { DealStatus } from '@app/api';
// Валюты и денежное форматирование переиспользуем из раздела услуг — единый формат по продукту.
export { CURRENCIES, DEFAULT_CURRENCY, formatPrice as formatMoney } from '../services/model';

/** Этапы воронки в порядке движения сделки (для канбана и сортировки). */
export const DEAL_STATUSES: DealStatus[] = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  NEW: 'Новая',
  QUALIFIED: 'Квалифицирована',
  PROPOSAL: 'Предложение',
  NEGOTIATION: 'Переговоры',
  WON: 'Выиграна',
  LOST: 'Проиграна',
};

/**
 * Цветовой тон chip'а этапа (классы токенов). Отражает движение по воронке:
 * серый (новая) → синий → фиолетовый → жёлтый (переговоры) → зелёный (выиграна) / красный (проиграна).
 */
export const DEAL_STATUS_TONE: Record<DealStatus, string> = {
  NEW: 'bg-bg-2 text-fg-secondary',
  QUALIFIED: 'bg-state-info-muted text-state-info',
  PROPOSAL: 'bg-accent-muted text-accent',
  NEGOTIATION: 'bg-state-warning-muted text-state-warning',
  WON: 'bg-state-success-muted text-state-success',
  LOST: 'bg-state-error-muted text-state-error',
};

/** Терминальные (закрытые) этапы — для них проставляется closed_at. */
export const CLOSED_STATUSES: DealStatus[] = ['WON', 'LOST'];

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
