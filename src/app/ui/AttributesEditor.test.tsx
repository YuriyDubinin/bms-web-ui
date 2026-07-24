import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttributesEditor } from './AttributesEditor';
import { AttributesView } from './AttributesView';

/** Последний JSON-текст, отданный onChange. */
function lastEmit(onChange: ReturnType<typeof vi.fn>): string {
  const calls = onChange.mock.calls;
  return calls.length ? (calls[calls.length - 1]![0] as string) : '';
}

describe('AttributesEditor — конструктор ⇄ JSON', () => {
  it('парсит существующий объект в конструктор и сериализует правку обратно (строка)', () => {
    const onChange = vi.fn();
    render(<AttributesEditor value={'{"owner":"Иванов"}'} onChange={onChange} />);

    expect(screen.getByDisplayValue('owner')).toBeInTheDocument();
    const value = screen.getByDisplayValue('Иванов');
    fireEvent.change(value, { target: { value: 'Петров' } });

    expect(JSON.parse(lastEmit(onChange))).toEqual({ owner: 'Петров' });
  });

  it('добавляет поле в пустом редакторе и отдаёт корректный JSON', () => {
    const onChange = vi.fn();
    render(<AttributesEditor value="" onChange={onChange} />);

    fireEvent.click(screen.getByText('Добавить поле'));
    fireEvent.change(screen.getByLabelText('Название поля'), { target: { value: 'city' } });
    fireEvent.change(screen.getByLabelText('Значение'), { target: { value: 'Алматы' } });

    expect(JSON.parse(lastEmit(onChange))).toEqual({ city: 'Алматы' });
  });

  it('число остаётся числом, а не строкой', () => {
    const onChange = vi.fn();
    render(<AttributesEditor value={'{"n":12}'} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('12'), { target: { value: '20' } });

    const parsed = JSON.parse(lastEmit(onChange));
    expect(parsed).toEqual({ n: 20 });
    expect(typeof parsed.n).toBe('number');
  });

  it('булево значение переключается сегментом Да/Нет', () => {
    const onChange = vi.fn();
    render(<AttributesEditor value={'{"vip":true}'} onChange={onChange} />);

    fireEvent.click(screen.getByText('Нет'));

    const parsed = JSON.parse(lastEmit(onChange));
    expect(parsed).toEqual({ vip: false });
    expect(typeof parsed.vip).toBe('boolean');
  });

  it('вложенные структуры открываются в JSON-режиме, вкладка «Конструктор» недоступна', () => {
    render(<AttributesEditor value={'{"list":[1,2,3]}'} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Доп. атрибуты, JSON')).toBeInTheDocument();
    expect(screen.getByText('Конструктор')).toBeDisabled();
  });

  it('пустой конструктор отдаёт пустую строку (форма трактует как «нет атрибутов»)', () => {
    const onChange = vi.fn();
    render(<AttributesEditor value={'{"a":"1"}'} onChange={onChange} />);

    // Очищаем ключ единственного поля → объект становится пустым.
    fireEvent.change(screen.getByDisplayValue('a'), { target: { value: '' } });

    expect(lastEmit(onChange)).toBe('');
  });
});

describe('AttributesView — вывод атрибутов', () => {
  it('показывает скаляры, булево — чипом Да/Нет', () => {
    render(<AttributesView attributes={{ owner: 'Иванов', vip: true, n: 5 }} />);

    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('Иванов')).toBeInTheDocument();
    expect(screen.getByText('Да')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('пустые атрибуты → аккуратная заглушка', () => {
    render(<AttributesView attributes={{}} />);
    expect(screen.getByText('Дополнительные атрибуты не заданы.')).toBeInTheDocument();
  });

  it('скрывает служебные ключи через hideKeys', () => {
    render(
      <AttributesView attributes={{ current_stage_id: 'x', a: '1' }} hideKeys={['current_stage_id']} />,
    );
    expect(screen.queryByText('current_stage_id')).not.toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });
});
