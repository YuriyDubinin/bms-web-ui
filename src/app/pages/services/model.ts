import type { ServiceStatus } from '@app/api';

export const SERVICE_STATUSES: ServiceStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  ACTIVE: 'Активна',
  INACTIVE: 'Неактивна',
  ARCHIVED: 'В архиве',
};

/** Цветовой тон chip'а статуса (классы токенов) — как в разделе проектов. */
export const SERVICE_STATUS_TONE: Record<ServiceStatus, string> = {
  ACTIVE: 'bg-state-success-muted text-state-success',
  INACTIVE: 'bg-state-warning-muted text-state-warning',
  ARCHIVED: 'bg-bg-2 text-fg-muted',
};

/**
 * Справочник валют для select. Код — ISO-4217 (3 буквы, верхний регистр),
 * как требует бэкенд; symbol — для компактного отображения цены в списке.
 */
export type CurrencyOption = { code: string; symbol: string; label: string };

export const CURRENCIES: CurrencyOption[] = [
  { code: 'RUB', symbol: '₽', label: 'Российский рубль' },
  { code: 'USD', symbol: '$', label: 'Доллар США' },
  { code: 'EUR', symbol: '€', label: 'Евро' },
  { code: 'GBP', symbol: '£', label: 'Фунт стерлингов' },
  { code: 'KZT', symbol: '₸', label: 'Казахстанский тенге' },
  { code: 'UAH', symbol: '₴', label: 'Украинская гривна' },
  { code: 'BYN', symbol: 'Br', label: 'Белорусский рубль' },
  { code: 'CNY', symbol: '¥', label: 'Китайский юань' },
  { code: 'TRY', symbol: '₺', label: 'Турецкая лира' },
  { code: 'AED', symbol: 'د.إ', label: 'Дирхам ОАЭ' },
];

export const DEFAULT_CURRENCY = 'USD';

/**
 * Цена + валюта в читаемом виде. Intl корректно локализует известные ISO-коды
 * («1 500,50 ₽»); для нестандартной валюты — мягкий фолбэк «1500.50 XXX».
 */
export function formatPrice(price: number | null, currency: string): string {
  if (price === null || price === undefined) return '—';
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price.toLocaleString('ru-RU')} ${code}`;
  }
}

/** Длительность в минутах → «45 мин» / «1 ч» / «1 ч 30 мин». */
export function formatDuration(min: number | null): string {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min} мин`;
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

/** RFC3339 → локальная дата (для created_at/updated_at). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}
