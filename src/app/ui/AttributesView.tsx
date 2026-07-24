import { type ReactNode } from 'react';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

/**
 * Аккуратный вывод доп. атрибутов (Record<string, unknown>) на детальных страницах.
 * Скаляры показываем строкой «ключ — значение» (в стиле мета-строк карточки), булевы —
 * чипом Да/Нет, массивы скаляров — чипами, вложенные объекты/массивы — форматированным
 * JSON в моноблоке с горизонтальной прокруткой (не «вылазит» на мобильном).
 */

export type AttributesViewProps = {
  attributes: Record<string, unknown>;
  /** Служебные ключи, которые не нужно показывать (например, current_stage_id). */
  hideKeys?: string[];
  /** Текст, когда атрибутов нет. */
  emptyText?: string;
};

function BoolChip({ value }: { value: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        value ? 'bg-state-success-muted text-state-success' : 'bg-bg-2 text-fg-muted',
      )}
    >
      {value ? 'Да' : 'Нет'}
    </span>
  );
}

function scalarNode(v: string | number | boolean): ReactNode {
  if (typeof v === 'boolean') return <BoolChip value={v} />;
  if (typeof v === 'number') return <span className="font-mono tabular-nums text-fg-primary">{String(v)}</span>;
  return <span className="text-fg-primary">{v}</span>;
}

function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-1 max-w-full overflow-x-auto rounded-md border border-border-subtle bg-bg-2 p-2.5 font-mono text-[11px] leading-relaxed text-fg-secondary">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AttributesView({
  attributes,
  hideKeys,
  emptyText = 'Дополнительные атрибуты не заданы.',
}: AttributesViewProps) {
  const hidden = new Set(hideKeys ?? []);
  const entries = Object.entries(attributes ?? {}).filter(([k]) => !hidden.has(k));

  if (entries.length === 0) {
    return <p className="text-sm text-fg-muted">{emptyText}</p>;
  }

  return (
    <dl className="flex flex-col">
      {entries.map(([key, value]) => {
        // Массив скаляров → чипы; объект/массив с вложенностью → JSON-блок.
        const scalarArray =
          Array.isArray(value) && value.length > 0 && value.every(isScalar);

        if (scalarArray) {
          return (
            <div key={key} className="border-b border-border-subtle py-2.5 last:border-0">
              <dt className="mb-1.5 text-xs text-fg-muted">{key}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {(value as (string | number | boolean)[]).map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex max-w-full items-center truncate rounded-full bg-bg-2 px-2 py-0.5 text-xs text-fg-secondary"
                  >
                    {String(item)}
                  </span>
                ))}
              </dd>
            </div>
          );
        }

        if (!isScalar(value)) {
          return (
            <div key={key} className="min-w-0 border-b border-border-subtle py-2.5 last:border-0">
              <dt className="text-xs text-fg-muted">{key}</dt>
              <dd className="min-w-0">
                {value === null ? <span className="text-sm text-fg-muted">—</span> : <JsonBlock value={value} />}
              </dd>
            </div>
          );
        }

        // Скаляр — компактная строка «ключ — значение».
        return (
          <div
            key={key}
            className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2.5 last:border-0"
          >
            <dt className="shrink-0 text-xs text-fg-muted">{key}</dt>
            <dd className="min-w-0 break-words text-right text-sm">{scalarNode(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
