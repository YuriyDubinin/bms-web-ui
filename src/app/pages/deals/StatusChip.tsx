import type { DealStatus, DealType } from '@app/api';
import {
  DEAL_STATUS_LABELS,
  DEAL_STATUS_TONE,
  DEAL_TYPE_LABELS,
  DEAL_TYPE_TONE,
} from './model';

const chipBase =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium';

/** Chip этапа воронки сделки — общий для таблицы и карточек. */
export function StatusChip({ status }: { status: DealStatus }) {
  return <span className={`${chipBase} ${DEAL_STATUS_TONE[status]}`}>{DEAL_STATUS_LABELS[status]}</span>;
}

/** Chip типа сделки: доход / расход. */
export function TypeChip({ type }: { type: DealType }) {
  return <span className={`${chipBase} ${DEAL_TYPE_TONE[type]}`}>{DEAL_TYPE_LABELS[type]}</span>;
}
