import type { CellValue, DataTableColumn, SortState } from './types';

const COLLATOR = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

/** Приводит примитивное значение ячейки к строке для поиска/сравнения/фильтров. */
export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Проходит ли элемент по глобальному поиску (по всем searchable-колонкам). */
export function matchesQuery<T>(
  item: T,
  columns: DataTableColumn<T>[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return columns.some((col) => {
    if (col.searchable === false || !col.value) return false;
    return cellText(col.value(item)).toLowerCase().includes(q);
  });
}

/** Проходит ли элемент по всем активным фильтрам колонок. */
export function matchesFilters<T>(
  item: T,
  columns: DataTableColumn<T>[],
  filters: Record<string, string>,
): boolean {
  return columns.every((col) => {
    if (!col.filter || !col.value) return true;
    const active = filters[col.key];
    if (!active) return true;
    const text = cellText(col.value(item));
    if (col.filter === 'select') return text === active;
    return text.toLowerCase().includes(active.trim().toLowerCase());
  });
}

/** Сравнение значений: числа — численно, булевы — как 0/1, строки — локали-осознанно. */
export function compareValues(a: CellValue, b: CellValue): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // пустые — в конец
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
  return COLLATOR.compare(String(a), String(b));
}

/** Стабильная сортировка по колонке. `sort=null` — исходный порядок. */
export function sortItems<T>(
  items: T[],
  columns: DataTableColumn<T>[],
  sort: SortState,
): T[] {
  if (!sort) return items;
  const col = columns.find((c) => c.key === sort.key);
  if (!col?.value) return items;
  const read = col.value;
  const factor = sort.dir === 'desc' ? -1 : 1;
  return [...items].sort((x, y) => factor * compareValues(read(x), read(y)));
}

/** Уникальные непустые значения колонки (для select-фильтра). */
export function uniqueValues<T>(items: T[], column: DataTableColumn<T>): string[] {
  if (!column.value) return [];
  const read = column.value;
  const set = new Set<string>();
  for (const item of items) {
    const text = cellText(read(item));
    if (text) set.add(text);
  }
  return [...set].sort((a, b) => COLLATOR.compare(a, b));
}
