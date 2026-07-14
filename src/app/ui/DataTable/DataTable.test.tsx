import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './types';
import { matchesFilters, matchesQuery, sortItems, uniqueValues } from './utils';

type Row = { id: string; name: string; status: string; amount: number };

const ROWS: Row[] = [
  { id: '1', name: 'Альфа', status: 'active', amount: 300 },
  { id: '2', name: 'Бета', status: 'lead', amount: 100 },
  { id: '3', name: 'Гамма', status: 'active', amount: 200 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Название', value: (r) => r.name, sortable: true },
  { key: 'status', header: 'Статус', value: (r) => r.status, filter: 'select' },
  { key: 'amount', header: 'Сумма', value: (r) => r.amount, sortable: true },
];

describe('DataTable utils', () => {
  it('matchesQuery ищет по всем searchable-колонкам без учёта регистра', () => {
    expect(matchesQuery(ROWS[0]!, COLUMNS, 'альф')).toBe(true);
    expect(matchesQuery(ROWS[0]!, COLUMNS, 'active')).toBe(true);
    expect(matchesQuery(ROWS[0]!, COLUMNS, 'бета')).toBe(false);
    expect(matchesQuery(ROWS[0]!, COLUMNS, '')).toBe(true);
  });

  it('matchesFilters фильтрует по точному значению select-колонки', () => {
    expect(matchesFilters(ROWS[0]!, COLUMNS, { status: 'active' })).toBe(true);
    expect(matchesFilters(ROWS[1]!, COLUMNS, { status: 'active' })).toBe(false);
    expect(matchesFilters(ROWS[1]!, COLUMNS, {})).toBe(true);
  });

  it('sortItems сортирует по числу в обе стороны и сбрасывается при null', () => {
    const asc = sortItems(ROWS, COLUMNS, { key: 'amount', dir: 'asc' });
    expect(asc.map((r) => r.amount)).toEqual([100, 200, 300]);
    const desc = sortItems(ROWS, COLUMNS, { key: 'amount', dir: 'desc' });
    expect(desc.map((r) => r.amount)).toEqual([300, 200, 100]);
    expect(sortItems(ROWS, COLUMNS, null)).toBe(ROWS);
  });

  it('uniqueValues возвращает уникальные непустые значения колонки', () => {
    expect(uniqueValues(ROWS, COLUMNS[1]!)).toEqual(['active', 'lead']);
  });
});

describe('DataTable component', () => {
  const setup = () =>
    render(<DataTable data={ROWS} columns={COLUMNS} getRowId={(r) => r.id} pageSize={10} />);

  it('рендерит все строки в таблице по умолчанию', () => {
    setup();
    expect(screen.getByText('Альфа')).toBeInTheDocument();
    expect(screen.getByText('Бета')).toBeInTheDocument();
    expect(screen.getByText('Гамма')).toBeInTheDocument();
  });

  it('фильтрует строки глобальным поиском', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Поиск по таблице'), { target: { value: 'гамма' } });
    expect(screen.getByText('Гамма')).toBeInTheDocument();
    expect(screen.queryByText('Альфа')).not.toBeInTheDocument();
    expect(screen.queryByText('Бета')).not.toBeInTheDocument();
  });

  it('фильтрует по колонке через select', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Фильтр: Статус'), { target: { value: 'lead' } });
    expect(screen.getByText('Бета')).toBeInTheDocument();
    expect(screen.queryByText('Альфа')).not.toBeInTheDocument();
  });

  it('показывает пустое состояние при отсутствии совпадений и сбрасывает его', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Поиск по таблице'), { target: { value: 'нет-такого' } });
    expect(screen.getByText('Ничего не найдено по заданным условиям')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(screen.getByText('Альфа')).toBeInTheDocument();
  });

  it('переключается в режим карточек', () => {
    setup();
    expect(screen.queryByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Карточки' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // Данные всё ещё на месте (в карточках).
    expect(screen.getByText('Альфа')).toBeInTheDocument();
  });

  it('вызывает onRowClick по клику на строку', () => {
    const clicked: string[] = [];
    render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        onRowClick={(r) => clicked.push(r.id)}
      />,
    );
    const row = screen.getByText('Бета').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByText('Бета'));
    expect(clicked).toEqual(['2']);
  });
});
