import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SelectSearch } from './SelectSearch';

const cx = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

/**
 * Редактор доп. атрибутов: удобный конструктор пар «ключ — значение» с типами
 * (строка / число / да-нет) вместо ручного JSON. Под капотом сериализует в тот же
 * JSON-объект и парсит существующий. Для вложенных структур (объекты/массивы) есть
 * запасной режим «JSON» — туда же уходит невалидный/сложный ввод.
 *
 * Контракт намеренно строковый: `value` — это JSON-текст (как раньше в textarea),
 * `onChange` отдаёт JSON-текст. Так формам не нужно менять валидацию/сборку payload —
 * достаточно заменить textarea на этот компонент.
 */

type AttrType = 'string' | 'number' | 'boolean';

type Row = { id: string; key: string; type: AttrType; value: string };

const TYPE_OPTIONS: { value: AttrType; label: string }[] = [
  { value: 'string', label: 'Строка' },
  { value: 'number', label: 'Число' },
  { value: 'boolean', label: 'Да / Нет' },
];

const fieldClass =
  'w-full min-w-0 rounded-md border border-border-subtle bg-bg-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted disabled:cursor-not-allowed disabled:opacity-50';

function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

/** Разбор входного JSON-текста: пусто / пригодно для конструктора (плоский объект скаляров) / только-JSON. */
type Parsed =
  | { kind: 'empty' }
  | { kind: 'builder'; rows: Row[] }
  | { kind: 'json'; text: string };

function parseValue(text: string, nextId: () => string): Parsed {
  const t = text.trim();
  if (!t) return { kind: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return { kind: 'json', text };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { kind: 'json', text };
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (!entries.every(([, v]) => isScalar(v))) return { kind: 'json', text };
  const rows: Row[] = entries.map(([k, v]) => ({
    id: nextId(),
    key: k,
    type: typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string',
    value: typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v),
  }));
  return { kind: 'builder', rows };
}

/** Пригоден ли текст для конструктора (пустой или плоский объект скаляров). */
function builderReady(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  try {
    const parsed: unknown = JSON.parse(t);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false;
    return Object.values(parsed as Record<string, unknown>).every(isScalar);
  } catch {
    return false;
  }
}

function rowsToObject(rows: Row[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const r of rows) {
    const key = r.key.trim();
    if (!key) continue;
    if (r.type === 'number') {
      const n = Number(r.value);
      obj[key] = Number.isFinite(n) ? n : 0;
    } else if (r.type === 'boolean') {
      obj[key] = r.value === 'true';
    } else {
      obj[key] = r.value;
    }
  }
  return obj;
}

/** Строки → JSON-текст. Пустой объект → '' (форма трактует это как «атрибутов нет»). */
function serialize(rows: Row[]): string {
  const obj = rowsToObject(rows);
  return Object.keys(obj).length === 0 ? '' : JSON.stringify(obj, null, 2);
}

/* --------------------------------- Иконки --------------------------------- */

function PlusIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/* -------------------------------- Компонент -------------------------------- */

export type AttributesEditorProps = {
  /** JSON-текст (как в прежней textarea). */
  value: string;
  /** Отдаёт JSON-текст: сериализованный объект конструктора или сырой JSON. */
  onChange: (jsonText: string) => void;
  disabled?: boolean;
  /** Подсветить ошибку (невалидный JSON — приходит из валидации формы). */
  hasError?: boolean;
  /** id для связи с внешним <label>. */
  id?: string;
};

function ModeTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cx(
        'rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-accent-muted text-accent' : 'text-fg-muted hover:text-fg-secondary',
      )}
    >
      {children}
    </button>
  );
}

export function AttributesEditor({ value, onChange, disabled, hasError, id }: AttributesEditorProps) {
  const idc = useRef(0);
  const nextId = () => `r${idc.current++}`;

  // Разбираем начальное значение один раз (без мигания); последующие внешние сбросы — через effect.
  const initial = useMemo(() => parseValue(value, nextId), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState<'builder' | 'json'>(initial.kind === 'json' ? 'json' : 'builder');
  const [rows, setRows] = useState<Row[]>(initial.kind === 'builder' ? initial.rows : []);
  const [jsonText, setJsonText] = useState(initial.kind === 'json' ? initial.text : '');
  const lastEmitted = useRef<string>(value);

  // Внешний сброс (форма открылась/сменила сущность) — переинициализируемся из value.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const p = parseValue(value, nextId);
    if (p.kind === 'json') {
      setMode('json');
      setJsonText(p.text);
      setRows([]);
    } else {
      setMode('builder');
      setRows(p.kind === 'builder' ? p.rows : []);
      setJsonText('');
    }
    lastEmitted.current = value;
  }, [value]);

  const emitRows = (next: Row[]) => {
    const s = serialize(next);
    lastEmitted.current = s;
    onChange(s);
  };

  const setRows2 = (next: Row[], emit = true) => {
    setRows(next);
    if (emit) emitRows(next);
  };

  const addRow = () => setRows((prev) => [...prev, { id: nextId(), key: '', type: 'string', value: '' }]);
  const removeRow = (rowId: string) => setRows2(rows.filter((r) => r.id !== rowId));
  const patchRow = (rowId: string, patch: Partial<Row>) =>
    setRows2(rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));

  const changeType = (rowId: string, type: AttrType) => {
    setRows2(
      rows.map((r) => {
        if (r.id !== rowId) return r;
        if (type === 'boolean') return { ...r, type, value: r.value === 'true' ? 'true' : 'false' };
        if (type === 'number') return { ...r, type, value: /^-?\d*\.?\d*$/.test(r.value) ? r.value : '' };
        return { ...r, type, value: r.value };
      }),
    );
  };

  const onJsonChange = (text: string) => {
    setJsonText(text);
    lastEmitted.current = text;
    onChange(text);
  };

  const toBuilder = () => {
    const p = parseValue(jsonText, nextId);
    if (p.kind === 'json') return; // сложный/невалидный — оставляем JSON
    const next = p.kind === 'builder' ? p.rows : [];
    setRows(next);
    setMode('builder');
    emitRows(next);
  };

  const toJson = () => {
    const s = serialize(rows);
    setJsonText(s);
    setMode('json');
    lastEmitted.current = s;
    onChange(s);
  };

  const canUseBuilder = mode === 'builder' || builderReady(jsonText);

  // Подсветка дубликатов ключей.
  const keyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = r.key.trim();
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Переключатель режимов */}
      <div className="flex items-center gap-1 self-start rounded-md border border-border-subtle bg-bg-2 p-1">
        <ModeTab active={mode === 'builder'} disabled={disabled || !canUseBuilder} onClick={toBuilder}>
          Конструктор
        </ModeTab>
        <ModeTab active={mode === 'json'} disabled={disabled} onClick={toJson}>
          JSON
        </ModeTab>
      </div>

      {mode === 'builder' ? (
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-center text-xs text-fg-muted">
              Пока нет полей. Добавьте параметры вида «ключ — значение».
            </p>
          ) : (
            rows.map((r) => {
              const dup = r.key.trim() !== '' && (keyCounts.get(r.key.trim()) ?? 0) > 1;
              return (
                <div key={r.id} className="rounded-md border border-border-subtle bg-bg-1 p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={r.key}
                      disabled={disabled}
                      placeholder="Название поля"
                      aria-label="Название поля"
                      onChange={(e) => patchRow(r.id, { key: e.target.value })}
                      className={cx(fieldClass, 'flex-1', dup && 'border-state-error')}
                    />
                    <div className="w-28 shrink-0 sm:w-32">
                      <SelectSearch
                        value={r.type}
                        disabled={disabled}
                        searchable={false}
                        ariaLabel="Тип значения"
                        onChange={(v) => changeType(r.id, v as AttrType)}
                        options={TYPE_OPTIONS}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      disabled={disabled}
                      aria-label="Удалить поле"
                      title="Удалить поле"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-border-subtle hover:text-state-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  <div className="mt-2">
                    {r.type === 'boolean' ? (
                      <div className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-2 p-1">
                        {(
                          [
                            { v: 'true', label: 'Да' },
                            { v: 'false', label: 'Нет' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            disabled={disabled}
                            aria-pressed={r.value === opt.v}
                            onClick={() => patchRow(r.id, { value: opt.v })}
                            className={cx(
                              'rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                              r.value === opt.v
                                ? 'bg-accent-muted text-accent'
                                : 'text-fg-muted hover:text-fg-secondary',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={r.type === 'number' ? 'number' : 'text'}
                        inputMode={r.type === 'number' ? 'decimal' : undefined}
                        value={r.value}
                        disabled={disabled}
                        placeholder="Значение"
                        aria-label="Значение"
                        onChange={(e) => patchRow(r.id, { value: e.target.value })}
                        className={fieldClass}
                      />
                    )}
                  </div>

                  {dup ? (
                    <p className="mt-1.5 text-xs text-state-error">Такой ключ уже есть — сохранится последний.</p>
                  ) : null}
                </div>
              );
            })
          )}

          <button
            id={id}
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon />
            Добавить поле
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <textarea
            id={id}
            rows={5}
            value={jsonText}
            disabled={disabled}
            placeholder="{}"
            spellCheck={false}
            aria-label="Доп. атрибуты, JSON"
            onChange={(e) => onJsonChange(e.target.value)}
            className={cx(
              'w-full min-w-0 resize-y rounded-md border bg-bg-1 px-3 py-2 font-mono text-xs text-fg-primary placeholder:text-fg-muted transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
              hasError
                ? 'border-state-error focus:border-state-error focus:ring-state-error-muted'
                : 'border-border-subtle focus:border-accent focus:ring-accent-muted',
            )}
          />
          <p className="text-xs text-fg-muted">
            Произвольный JSON-объект. Для вложенных структур (списки, объекты) используйте этот режим.
          </p>
        </div>
      )}
    </div>
  );
}
