import { describe, expect, it } from 'vitest';
import { assertEntityRecordShape } from '#tracker_api/api_operations/entity-api/assert-entity-record-shape.util.js';

describe('assertEntityRecordShape', () => {
  it('пропускает нормальную одиночную запись (есть id)', () => {
    const record = { id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' };

    expect(assertEntityRecordShape(record, 'get_entity goal/1')).toBe(record);
  });

  it('пропускает запись с числовым id', () => {
    const record = { id: 1, entityType: 'goal' };

    expect(assertEntityRecordShape(record, 'get_entity goal/1')).toBe(record);
  });

  // РЕГРЕССИЯ (в духе `_search`): если конверт поиска {hits,pages,values}
  // когда-нибудь протечёт в single-record ветку — явная ошибка, а не тихая
  // порча данных агента.
  it('конверт поиска {hits, pages, values} вместо записи — явная ошибка', () => {
    expect(() =>
      assertEntityRecordShape({ hits: 1, pages: 1, values: [{ id: '1' }] }, 'get_entity goal/1')
    ).toThrow(/конверт поиска/);
  });

  it('конверт поиска без values (пустая выдача) вместо записи — тоже явная ошибка', () => {
    expect(() => assertEntityRecordShape({ hits: 0, pages: 0 }, 'get_entity goal/1')).toThrow(
      /конверт поиска/
    );
  });

  it('объект без id — явная ошибка с дампом полей', () => {
    expect(() => assertEntityRecordShape({ foo: 'bar' }, 'get_entity goal/1')).toThrow(
      /неожиданную форму ответа для одиночной записи/
    );
  });

  it('null — явная ошибка', () => {
    expect(() => assertEntityRecordShape(null, 'get_entity goal/1')).toThrow(
      /неожиданную форму ответа/
    );
  });

  it('массив — явная ошибка (это не одна запись)', () => {
    expect(() => assertEntityRecordShape([{ id: '1' }], 'get_entity goal/1')).toThrow(
      /неожиданную форму ответа/
    );
  });
});
