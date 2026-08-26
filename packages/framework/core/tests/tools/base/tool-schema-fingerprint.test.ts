/**
 * Отпечаток схемы параметров: без него запись «наблюдалось живьём» в реестре
 * yandex-tracker ничем не привязана к состоянию кода.
 *
 * Главное здесь — ДЕТЕРМИНИЗМ: отпечаток, зависящий от порядка ключей или от
 * запуска, роняет барьер на ровном месте, и барьер начинают отключать.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { BaseTool } from '../../../src/tools/base/base-tool.js';
import { ToolCategory } from '../../../src/tools/base/tool-metadata.js';
import type { ToolClassLike } from '../../../src/tools/base/tool-input-schema.js';
import {
  computeSchemaFingerprint,
  computeToolSchemaFingerprint,
} from '../../../src/tools/base/tool-schema-fingerprint.js';

function makeZodTool(name: string, schema: z.ZodObject<z.ZodRawShape>): ToolClassLike {
  class ZodBackedTool extends BaseTool<unknown> {
    static override readonly METADATA = {
      name,
      description: `Тестовый инструмент ${name}`,
      category: ToolCategory.HELPERS,
      tags: ['test'],
      isHelper: true,
    };
    protected override getParamsSchema(): z.ZodObject<z.ZodRawShape> {
      return schema;
    }
    override execute(): never {
      throw new Error('not used in this test');
    }
  }
  return ZodBackedTool as unknown as ToolClassLike;
}

describe('computeSchemaFingerprint', () => {
  it('порядок ключей на отпечаток не влияет — иначе барьер падал бы от перестановки полей', () => {
    const left = { type: 'object', properties: { a: { type: 'string' }, b: { type: 'number' } } };
    const right = { properties: { b: { type: 'number' }, a: { type: 'string' } }, type: 'object' };

    expect(computeSchemaFingerprint(left)).toBe(computeSchemaFingerprint(right));
  });

  it('порядок элементов массива на отпечаток влияет — в схеме он значим (anyOf, prefixItems)', () => {
    const left = { anyOf: [{ type: 'string' }, { type: 'number' }] };
    const right = { anyOf: [{ type: 'number' }, { type: 'string' }] };

    expect(computeSchemaFingerprint(left)).not.toBe(computeSchemaFingerprint(right));
  });

  it('повторный вызов на одном входе даёт то же значение', () => {
    const schema = { type: 'object', properties: { a: { type: 'string' } } };

    expect(computeSchemaFingerprint(schema)).toBe(computeSchemaFingerprint(schema));
  });

  it('изменение содержимого меняет отпечаток', () => {
    const before = { type: 'object', properties: { a: { type: 'string' } } };
    const after = { type: 'object', properties: { a: { type: 'string', minLength: 1 } } };

    expect(computeSchemaFingerprint(before)).not.toBe(computeSchemaFingerprint(after));
  });

  it('ключ со значением undefined неотличим от отсутствующего — как и в JSON.stringify', () => {
    expect(computeSchemaFingerprint({ a: 1, b: undefined })).toBe(
      computeSchemaFingerprint({ a: 1 })
    );
  });

  it('отпечаток короткий и hex — строка обязана читаться в диффе реестра', () => {
    expect(computeSchemaFingerprint({ a: 1 })).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('computeToolSchemaFingerprint', () => {
  it('одинаковая схема у разных классов даёт один отпечаток — считается схема, а не класс', () => {
    const shape = { issueId: z.string().describe('ключ задачи') };
    const left = makeZodTool('left_tool', z.object(shape));
    const right = makeZodTool('right_tool', z.object(shape));

    expect(computeToolSchemaFingerprint(left)).toBe(computeToolSchemaFingerprint(right));
  });

  it('новый параметр в схеме меняет отпечаток — на этом держится привязка записи к коду', () => {
    const before = makeZodTool('probe_tool', z.object({ issueId: z.string() }));
    const after = makeZodTool(
      'probe_tool',
      z.object({ issueId: z.string(), extra: z.string().optional() })
    );

    expect(computeToolSchemaFingerprint(before)).not.toBe(computeToolSchemaFingerprint(after));
  });

  it('нечитаемая схема бросает наверх — штамповать пустоту нельзя', () => {
    class BrokenTool {
      static readonly METADATA = {
        name: 'broken_tool',
        description: 'бросает в конструкторе',
        category: ToolCategory.HELPERS,
        tags: ['test'],
        isHelper: true,
      };
      constructor() {
        throw new Error('конструктор инструмента бросает');
      }
      getDefinition(): never {
        throw new Error('not reached');
      }
    }

    expect(() => computeToolSchemaFingerprint(BrokenTool as unknown as ToolClassLike)).toThrow(
      /конструктор/
    );
  });
});
