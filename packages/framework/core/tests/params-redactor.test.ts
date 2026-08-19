/**
 * Тесты redaction-модуля параметров вызова инструмента
 *
 * Проверяет:
 * - значение параметра НИКОГДА не попадает в результат без allow-list;
 * - имена ключей верхнего уровня и вложенных объектов сохраняются;
 * - строки заменяются на маркер с ДЛИНОЙ, а не на префикс;
 * - граничные условия: вложенность, массивы, null/undefined, циклы,
 *   очень большие payload — редактор ограничивает собственную работу.
 */

import { describe, it, expect } from 'vitest';
import { redactParams } from '../src/tool-registry/params-redactor.js';

/** Рекурсивно ищет строку-маркер где-либо в значении результата редактора */
function containsMarker(value: unknown, marker: string): boolean {
  if (typeof value === 'string') {
    return value.includes(marker);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsMarker(item, marker));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => containsMarker(item, marker));
  }
  return false;
}

describe('redactParams', () => {
  const SECRET_MARKER = 'UNIQUE_SECRET_MARKER_7f3a9c21';

  it('не оставляет секретную строку нигде в результате (без allow-list)', () => {
    const result = redactParams({ comment: `Some text with ${SECRET_MARKER} inside` });

    expect(containsMarker(result, SECRET_MARKER)).toBe(false);
    expect(JSON.stringify(result)).not.toContain(SECRET_MARKER);
  });

  it('не оставляет ДАЖЕ ПРЕФИКС секрета — маркер заменяется на длину, а не на начало строки', () => {
    // Намеренно НЕ содержит слов вроде "string"/"type", чтобы случайное
    // совпадение короткого префикса с текстом маркера формы не давало
    // ложного провала теста.
    const secret = 'qz7-KRUZHKA-99xVPLOT-SUFFIX';
    const result = redactParams({ token: secret });

    const shape = result['token'] as { type: string; length: number };
    expect(shape.type).toBe('string');
    expect(shape.length).toBe(secret.length);
    // Ни один содержательный префикс исходной строки (от 4 символов) не
    // должен встречаться в сериализованном результате.
    for (let prefixLen = 4; prefixLen <= secret.length; prefixLen++) {
      expect(JSON.stringify(result)).not.toContain(secret.slice(0, prefixLen));
    }
  });

  it('сохраняет имена параметров верхнего уровня', () => {
    const result = redactParams({ issueId: 'TEST-1', comment: 'text', queue: 'TEST' });

    expect(Object.keys(result).sort()).toEqual(['comment', 'issueId', 'queue']);
  });

  it('сохраняет имена ключей во вложенных объектах', () => {
    const result = redactParams({
      payload: { title: 'секретный заголовок', body: 'секретное тело' },
    });

    const payloadShape = result['payload'] as { type: string; properties: Record<string, unknown> };
    expect(payloadShape.type).toBe('object');
    expect(Object.keys(payloadShape.properties).sort()).toEqual(['body', 'title']);
  });

  it('allow-listed параметр раскрывается как есть', () => {
    const result = redactParams(
      { issueId: 'TEST-42', comment: 'приватный текст' },
      { allowedKeys: ['issueId'] }
    );

    expect(result['issueId']).toBe('TEST-42');
    // comment остаётся редактированным
    expect(result['comment']).toEqual({ type: 'string', length: 'приватный текст'.length });
  });

  it('allow-list применяется по имени ключа на любой глубине вложенности', () => {
    const result = redactParams(
      { wrapper: { queue: 'TESTQ', comment: SECRET_MARKER } },
      { allowedKeys: ['queue'] }
    );

    const wrapperShape = result['wrapper'] as { properties: Record<string, unknown> };
    expect(wrapperShape.properties['queue']).toBe('TESTQ');
    expect(containsMarker(wrapperShape.properties['comment'], SECRET_MARKER)).toBe(false);
  });

  it('даже allow-listed значение не раскрывается полностью, если оно подозрительно длинное', () => {
    const longValue = 'x'.repeat(10_000);
    const result = redactParams({ issueId: longValue }, { allowedKeys: ['issueId'] });

    const shape = result['issueId'] as { value: string; length: number; truncated: boolean };
    expect(shape.truncated).toBe(true);
    expect(shape.length).toBe(10_000);
    expect(shape.value.length).toBeLessThan(600);
  });

  describe('граничные условия', () => {
    it('undefined и null получают собственную форму, а не совпадают с "пусто"', () => {
      const result = redactParams({ a: undefined, b: null });

      expect(result['a']).toEqual({ type: 'undefined' });
      expect(result['b']).toEqual({ type: 'null' });
    });

    it('числа и булевы значения по умолчанию редактируются (не только строки)', () => {
      const result = redactParams({ count: 42, isDone: true });

      expect(result['count']).toEqual({ type: 'number' });
      expect(result['isDone']).toEqual({ type: 'boolean' });
    });

    it('массив получает length и не раскрывает содержимое элементов-строк', () => {
      const result = redactParams({ items: ['секрет1', 'секрет2', 'секрет3'] });

      const shape = result['items'] as { type: string; length: number; items: unknown[] };
      expect(shape.type).toBe('array');
      expect(shape.length).toBe(3);
      expect(containsMarker(shape.items, 'секрет')).toBe(false);
    });

    it('массив объектов сохраняет имена ключей объектов-элементов', () => {
      const result = redactParams({ issues: [{ id: 'A-1', comment: 'text' }] });

      const shape = result['issues'] as { items: Array<{ properties: Record<string, unknown> }> };
      expect(Object.keys(shape.items[0]?.properties ?? {}).sort()).toEqual(['comment', 'id']);
    });

    it('очень большой массив: редактор ограничивает число обрабатываемых элементов', () => {
      const bigArray = Array.from({ length: 100_000 }, (_, i) => `item-${i}`);
      const start = performance.now();
      const result = redactParams({ items: bigArray });
      const elapsedMs = performance.now() - start;

      const shape = result['items'] as {
        length: number;
        items: unknown[];
        truncatedItems?: number;
      };
      expect(shape.length).toBe(100_000);
      expect(shape.items.length).toBeLessThan(100);
      expect(shape.truncatedItems).toBeGreaterThan(0);
      // Редактор не должен сам стать источником нагрузки на большом payload
      expect(elapsedMs).toBeLessThan(200);
    });

    it('очень большой объект (много ключей): число обрабатываемых ключей ограничено', () => {
      const bigObject: Record<string, unknown> = {};
      for (let i = 0; i < 10_000; i++) {
        bigObject[`key_${i}`] = `value_${i}`;
      }

      const result = redactParams({ payload: bigObject });
      const payloadShape = result['payload'] as {
        properties: Record<string, unknown>;
        truncatedKeys?: number;
      };

      expect(Object.keys(payloadShape.properties).length).toBeLessThan(100);
      expect(payloadShape.truncatedKeys).toBeGreaterThan(0);
    });

    it('очень большое число параметров верхнего уровня тоже ограничивается', () => {
      const params: Record<string, unknown> = {};
      for (let i = 0; i < 5000; i++) {
        params[`p${i}`] = i;
      }

      const result = redactParams(params);

      expect(Object.keys(result).length).toBeLessThan(200);
      expect(result['__truncatedKeys']).toBeGreaterThan(0);
    });

    it('глубоко вложенная структура: рекурсия ограничена по глубине', () => {
      let deep: Record<string, unknown> = { leaf: SECRET_MARKER };
      for (let i = 0; i < 20; i++) {
        deep = { nested: deep };
      }

      const result = redactParams({ root: deep });

      // Секрет нигде не должен всплыть, независимо от глубины
      expect(containsMarker(result, SECRET_MARKER)).toBe(false);
      // Где-то на пути должна встретиться отметка обрезки по глубине
      expect(JSON.stringify(result)).toContain('max-depth');
    });

    it('циклическая ссылка не приводит к бесконечной рекурсии/переполнению стека', () => {
      const cyclic: Record<string, unknown> = { name: 'root' };
      cyclic['self'] = cyclic;

      expect(() => redactParams({ obj: cyclic })).not.toThrow();

      const result = redactParams({ obj: cyclic });
      expect(JSON.stringify(result)).toContain('circular');
    });

    it('общая (не циклическая) ссылка на один и тот же объект из двух мест не считается циклом', () => {
      const shared = { id: 'shared-1' };
      const result = redactParams({ a: shared, b: shared });

      expect(JSON.stringify(result)).not.toContain('circular');
    });
  });
});
