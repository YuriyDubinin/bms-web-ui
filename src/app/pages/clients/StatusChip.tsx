import type { Client, ClientStatus } from '@app/api';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONE,
  CLIENT_SUBJECT_TYPE_LABELS,
  CLIENT_SUBJECT_TYPE_TONE,
  clientSubjectType,
} from './model';
import { BuildingIcon, UserIcon } from './icons';

/** Chip статуса клиента — общий для таблицы и карточек. */
export function StatusChip({ status }: { status: ClientStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${CLIENT_STATUS_TONE[status]}`}
    >
      {CLIENT_STATUS_LABELS[status]}
    </span>
  );
}

/** Chip вида субъекта (физлицо/юрлицо) с иконкой — общий для таблицы и карточек. */
export function SubjectTypeChip({ client }: { client: Client }) {
  const type = clientSubjectType(client);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${CLIENT_SUBJECT_TYPE_TONE[type]}`}
    >
      {type === 'LEGAL_ENTITY' ? <BuildingIcon /> : <UserIcon />}
      {CLIENT_SUBJECT_TYPE_LABELS[type]}
    </span>
  );
}
