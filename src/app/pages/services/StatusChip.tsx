import type { ServiceStatus } from '@app/api';
import { SERVICE_STATUS_LABELS, SERVICE_STATUS_TONE } from './model';

/** Chip статуса услуги — общий для таблицы и карточек. */
export function StatusChip({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${SERVICE_STATUS_TONE[status]}`}
    >
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}
