// tests/unit/tools/shared/filter-fields.test.ts
import { describe, it, expect } from 'vitest';
import { filterFields, filterFieldsArray } from '../../../../src/tools/shared/filter-fields.js';

describe('filterFields', () => {
  it('должен вернуть все поля при пустом массиве fields', () => {
    const data = { id: 1, name: 'Test', description: 'Desc' };

    const result = filterFields(data, []);

    expect(result).toEqual(data);
  });

  it('должен отфильтровать объект по указанным полям', () => {
    const data = { id: 1, name: 'Test', description: 'Desc', extra: 'Extra' };

    const result = filterFields(data, ['id', 'name']);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('extra');
  });

  it('должен работать с вложенными объектами', () => {
    const data = {
      id: 1,
      name: 'Test',
      nested: {
        value: 'nested value',
        other: 'other value',
      },
    };

    const result = filterFields(data, ['id', 'nested.value']);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('nested');
  });
});

describe('filterFieldsArray', () => {
  it('должен вернуть весь массив при пустом массиве fields', () => {
    const items = [
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' },
    ];

    const result = filterFieldsArray(items, []);

    expect(result).toEqual(items);
  });

  it('должен отфильтровать массив объектов по указанным полям', () => {
    const items = [
      { id: 1, name: 'Test 1', description: 'Desc 1' },
      { id: 2, name: 'Test 2', description: 'Desc 2' },
    ];

    const result = filterFieldsArray(items, ['id', 'name']);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).not.toHaveProperty('description');
    expect(result[1]).toHaveProperty('id');
    expect(result[1]).toHaveProperty('name');
    expect(result[1]).not.toHaveProperty('description');
  });

  it('должен работать с пустым массивом', () => {
    const result = filterFieldsArray([], ['id', 'name']);

    expect(result).toEqual([]);
  });
});
