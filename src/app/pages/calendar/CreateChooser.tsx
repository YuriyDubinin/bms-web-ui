import { Modal } from '@app/ui';
import { NavGlyph, type NavIconName } from '@app/layout/icons';

export type CreateKind = 'task' | 'deal' | 'project' | 'client' | 'service' | 'process';

type Option = { kind: CreateKind; icon: NavIconName; label: string; hint: string };

/** С датой — ложатся на календарь; без даты — просто быстрое создание из календаря. */
const DATED: Option[] = [
  { kind: 'task', icon: 'tasks', label: 'Задача', hint: 'Дедлайн на выбранную дату' },
  { kind: 'deal', icon: 'deals', label: 'Сделка', hint: 'Ожидаемое закрытие на дату' },
  { kind: 'project', icon: 'projects', label: 'Проект', hint: 'Старт (или период) с даты' },
  { kind: 'process', icon: 'processes', label: 'Процесс', hint: 'Плановый период с даты' },
];
const UNDATED: Option[] = [
  { kind: 'client', icon: 'clients', label: 'Клиент', hint: 'Без привязки к дате' },
  { kind: 'service', icon: 'services', label: 'Услуга', hint: 'Без привязки к дате' },
];

function Row({ opt, onPick }: { opt: Option; onPick: (k: CreateKind) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(opt.kind)}
      className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 px-3 py-3 text-left transition-colors hover:border-accent hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-fg-secondary">
        <NavGlyph name={opt.icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg-primary">{opt.label}</span>
        <span className="block truncate text-xs text-fg-muted">{opt.hint}</span>
      </span>
    </button>
  );
}

/** Диалог выбора создаваемой сущности. Дата (если есть) подставится в форму. */
export function CreateChooser({
  open,
  dateLabel,
  onPick,
  onClose,
}: {
  open: boolean;
  /** Человекочитаемая дата клика (для подзаголовка) или null. */
  dateLabel: string | null;
  onPick: (kind: CreateKind) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Что создать?"
      description={dateLabel ? `Дата: ${dateLabel}` : 'Выберите тип записи'}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">На календаре</p>
          {DATED.map((o) => (
            <Row key={o.kind} opt={o} onPick={onPick} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Быстрое создание</p>
          {UNDATED.map((o) => (
            <Row key={o.kind} opt={o} onPick={onPick} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
