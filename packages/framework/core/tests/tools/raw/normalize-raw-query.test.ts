import { describe, expect, it } from 'vitest';
import { normalizeRawQuery } from '../../../src/tools/raw/normalize-raw-query.js';

describe('normalizeRawQuery', () => {
  it('возвращает undefined для undefined', () => {
    expect(normalizeRawQuery(undefined)).toBeUndefined();
  });

  it('возвращает пустой объект для пустого объекта', () => {
    expect(normalizeRawQuery({})).toEqual({});
  });

  it('сериализует массив в строку через запятую', () => {
    expect(normalizeRawQuery({ expand: ['transitions', 'attachments'] })).toEqual({
      expand: 'transitions,attachments',
    });
  });

  it('массив из одного элемента — без запятой', () => {
    expect(normalizeRawQuery({ expand: ['transitions'] })).toEqual({ expand: 'transitions' });
  });

  it('скаляры передаются без изменений', () => {
    expect(normalizeRawQuery({ perPage: 50, withDeleted: true, key: 'QUEUE-1' })).toEqual({
      perPage: 50,
      withDeleted: true,
      key: 'QUEUE-1',
    });
  });

  it('смешанные значения: массив джойнится, скаляры остаются', () => {
    expect(normalizeRawQuery({ expand: ['comments'], perPage: 10, q: 'x' })).toEqual({
      expand: 'comments',
      perPage: 10,
      q: 'x',
    });
  });
});
