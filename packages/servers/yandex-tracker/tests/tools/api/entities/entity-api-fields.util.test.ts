import { describe, expect, it } from 'vitest';
import { extractEntityApiFields } from '#tools/api/entities/entity-api-fields.util.js';

describe('extractEntityApiFields', () => {
  it('берёт имена только из веток `fields.*`', () => {
    expect(extractEntityApiFields(['id', 'shortId', 'fields.summary', 'version'])).toEqual([
      'summary',
    ]);
  });

  it('срезает вложенность до имени поля Трекера', () => {
    expect(extractEntityApiFields(['fields.teamAccess.users'])).toEqual(['teamAccess']);
  });

  it('схлопывает дубли', () => {
    expect(extractEntityApiFields(['fields.summary', 'fields.summary.text'])).toEqual(['summary']);
  });

  it('без веток `fields.*` не запрашивает ничего', () => {
    expect(extractEntityApiFields(['id', 'version'])).toEqual([]);
  });

  it('игнорирует голый префикс без имени', () => {
    expect(extractEntityApiFields(['fields.'])).toEqual([]);
  });

  // `['id','fields']` — легальная проекция «отдай весь вложенный объект»
  // (документирована в ResponseFieldFilter). Entity API так не умеет: способа
  // запросить все поля разом нет. Молчаливый пустой результат воспроизводил бы
  // ровно тот дефект, который эта утилита чинит.
  it('отклоняет голую проекцию `fields` явной ошибкой', () => {
    expect(() => extractEntityApiFields(['id', 'fields'])).toThrow(
      /перечисли нужные поля поимённо/
    );
  });
});
