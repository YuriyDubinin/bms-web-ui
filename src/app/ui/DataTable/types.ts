import type { ReactNode } from 'react';

/** Примитивное значение ячейки — по нему идут поиск, сортировка и фильтрация. */
export type CellValue = string | number | boolean | null | undefined;

export type SortDirection = 'asc' | 'desc';

export type SortState = { key: string; dir: SortDirection } | null;

/** Тип фильтра по колонке: выпадающий список уникальных значений или подстрока. */
export type ColumnFilterKind = 'select' | 'text';

export type DataTableColumn<T> = {
  /** Уникальный ключ колонки. */
  key: string;
  /** Заголовок колонки (в таблице и как метка в карточке). */
  header: ReactNode;
  /**
   * Примитивное значение ячейки для поиска/сортировки/фильтрации.
   * Без него колонка только отображается (через `cell`) и не участвует в этих операциях.
   */
  value?: (item: T) => CellValue;
  /** Кастомный рендер ячейки. По умолчанию — строковое представление `value`. */
  cell?: (item: T) => ReactNode;
  /** Разрешить сортировку по колонке (требуется `value`). */
  sortable?: boolean;
  /** Включить фильтр по колонке (требуется `value`). */
  filter?: ColumnFilterKind;
  /** Метка фильтра/плейсхолдер. По умолчанию — `header`, если это строка. */
  filterLabel?: string;
  /** Участвует ли колонка в глобальном поиске. По умолчанию `true` при наличии `value`. */
  searchable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Класс ячейки `<td>`. */
  cellClassName?: string;
  /** Класс заголовка `<th>`. */
  headerClassName?: string;
};

export type DataTableView = 'table' | 'cards';

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Стабильный уникальный ключ строки. */
  getRowId: (item: T) => string;
  /** Рендер карточки для режима «карточки». По умолчанию — список «заголовок: значение». */
  renderCard?: (item: T) => ReactNode;
  /** Показывать поле глобального поиска. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Начальный режим отображения. */
  initialView?: DataTableView;
  /** Разрешить переключение таблица ⇄ карточки. */
  allowViewToggle?: boolean;
  /** Размер страницы (клиентская пагинация). `0`/не задан — без пагинации. */
  pageSize?: number;
  /** Состояние загрузки — показывает скелетон. */
  isLoading?: boolean;
  /** Что показать, когда данных нет вовсе. */
  emptyState?: ReactNode;
  /** Клик по строке/карточке. */
  onRowClick?: (item: T) => void;
  /** Доп. элементы тулбара справа (например кнопка «Создать»). */
  toolbarActions?: ReactNode;
  className?: string;
};
