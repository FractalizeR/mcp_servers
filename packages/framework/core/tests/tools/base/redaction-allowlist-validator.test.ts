/**
 * `validateRedactionAllowlist`: каждый ключ `METADATA.redactionAllowlist` обязан называть
 * параметр, реально существующий в схеме параметров инструмента, на любой
 * глубине. Обратное направление не проверяется — тесты этого файла не
 * заводят кейс «параметр схемы не в allowlist», он не является ошибкой.
 *
 * Границы, обязательные планом (0_CONTEXT.md, §"Граничные случаи"):
 * ключ только во вложенном объекте / только в элементе массива / только в
 * одной ветке anyOf — все три должны ПРОХОДИТЬ; ключа нет нигде,
 * нечитаемая схема при непустом/пустом allowlist, читаемая-но-пустая
 * схема при непустом allowlist, два инструмента с расхождениями сразу.
 *
 * Плюс формы, которые обходчик обязан знать, чтобы не давать ложный красный:
 * `$ref`/`$defs` (`z.lazy`), объектный `additionalProperties` (`z.record`),
 * `prefixItems` (`z.tuple` под Zod 4) и `patternProperties` (эта версия Zod
 * его не порождает — кейс идёт мимо Zod-конвейера).
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { BaseTool } from '../../../src/tools/base/base-tool.js';
import { ToolCategory } from '../../../src/tools/base/tool-metadata.js';
import type { StaticToolMetadata } from '../../../src/tools/base/tool-metadata.js';
import type { ToolDefinition } from '../../../src/tools/base/base.types.js';
import { validateRedactionAllowlist } from '../../../src/tools/base/redaction-allowlist-validator.js';
import type { ToolClassLike } from '../../../src/tools/base/tool-input-schema.js';

function buildMetadata(name: string, redactionAllowlist: readonly string[]): StaticToolMetadata {
  return {
    name,
    description: `Тестовый инструмент ${name}`,
    category: ToolCategory.HELPERS,
    tags: ['test'],
    isHelper: true,
    redactionAllowlist,
  };
}

/** Реальный BaseTool + Zod schema — для границ, где важна фактическая генерация JSON Schema. */
function makeZodTool(
  name: string,
  redactionAllowlist: readonly string[],
  schema: z.ZodObject<z.ZodRawShape>
): ToolClassLike {
  class ZodBackedTool extends BaseTool<unknown> {
    static override readonly METADATA = buildMetadata(name, redactionAllowlist);
    protected override getParamsSchema(): z.ZodObject<z.ZodRawShape> {
      return schema;
    }
    override execute(): never {
      throw new Error('not used in this test');
    }
  }
  return ZodBackedTool as unknown as ToolClassLike;
}

/** Duck-typed класс в обход BaseTool — для крайних случаев, которые реальный Zod-конвейер произвести не может. */
function makeRawTool(
  name: string,
  redactionAllowlist: readonly string[],
  behavior: {
    throwOnConstruct?: boolean;
    throwOnGetDefinition?: boolean;
    inputSchema?: ToolDefinition['inputSchema'];
  }
): ToolClassLike {
  class RawTool {
    static readonly METADATA = buildMetadata(name, redactionAllowlist);
    constructor() {
      if (behavior.throwOnConstruct) {
        throw new Error('конструктор инструмента бросает');
      }
    }
    getDefinition(): ToolDefinition {
      if (behavior.throwOnGetDefinition) {
        throw new Error('getDefinition() бросает');
      }
      return {
        name,
        description: `Тестовый инструмент ${name}`,
        inputSchema: behavior.inputSchema ?? { type: 'object', properties: {} },
      };
    }
  }
  return RawTool as unknown as ToolClassLike;
}

describe('validateRedactionAllowlist', () => {
  it('пустой allowlist — пропуск без обращения к схеме', () => {
    const tool = makeRawTool('empty_allowlist', [], { throwOnConstruct: true });
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключ допуска есть только во вложенном объекте — проходит', () => {
    const schema = z.object({
      issue: z.object({ issueId: z.string() }),
    });
    const tool = makeZodTool('nested_object', ['issueId'], schema);
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключ допуска есть только в элементе массива — проходит', () => {
    const schema = z.object({
      comments: z.array(z.object({ issueId: z.string(), text: z.string() })),
    });
    const tool = makeZodTool('array_item', ['issueId'], schema);
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключ допуска есть только в одной ветке anyOf/oneOf — проходит', () => {
    const schema = z.object({
      target: z.union([z.object({ issueId: z.string() }), z.object({ queue: z.string() })]),
    });
    const tool = makeZodTool('anyof_branch', ['issueId', 'queue'], schema);
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключа допуска нет нигде — ошибка называет инструмент и ключ', () => {
    const schema = z.object({ issueId: z.string() });
    const tool = makeZodTool('missing_key', ['issueId', 'ghostKey'], schema);
    const errors = validateRedactionAllowlist([tool]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('missing_key');
    expect(errors[0]).toContain('ghostKey');
  });

  it('схема не читается (бросок конструктора), redactionAllowlist непуст — ОШИБКА', () => {
    const tool = makeRawTool('unreadable_construct', ['issueId'], { throwOnConstruct: true });
    const errors = validateRedactionAllowlist([tool]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unreadable_construct');
  });

  it('схема не читается (бросок getDefinition), redactionAllowlist непуст — ОШИБКА', () => {
    const tool = makeRawTool('unreadable_definition', ['issueId'], {
      throwOnGetDefinition: true,
    });
    const errors = validateRedactionAllowlist([tool]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unreadable_definition');
  });

  it('схема не читается, redactionAllowlist пуст — пропуск без ошибки', () => {
    const tool = makeRawTool('unreadable_but_empty_allowlist', [], {
      throwOnConstruct: true,
    });
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('схема читается, но состав пуст при непустом allowlist — ОШИБКА (тот же класс)', () => {
    const tool = makeRawTool('empty_schema_composition', ['issueId'], {
      inputSchema: { type: 'object', properties: {} },
    });
    const errors = validateRedactionAllowlist([tool]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('empty_schema_composition');
  });

  it('два инструмента с расхождениями — обе ошибки в списке, а не первая', () => {
    const schemaA = z.object({ issueId: z.string() });
    const schemaB = z.object({ queue: z.string() });
    const toolA = makeZodTool('tool_a', ['issueId', 'ghostA'], schemaA);
    const toolB = makeZodTool('tool_b', ['queue', 'ghostB'], schemaB);

    const errors = validateRedactionAllowlist([toolA, toolB]);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.includes('tool_a') && e.includes('ghostA'))).toBe(true);
    expect(errors.some((e) => e.includes('tool_b') && e.includes('ghostB'))).toBe(true);
  });

  it('ключ допуска есть только за `$ref` в `$defs` — проходит', () => {
    const node: z.ZodType = z.lazy(() =>
      z.object({ nodeName: z.string(), kids: z.array(node).optional() })
    );
    const tool = makeZodTool('ref_defs', ['nodeName'], z.object({ root: node }));
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключ допуска есть только в схеме значений `z.record()` (объектный additionalProperties) — проходит', () => {
    const schema = z.object({
      map: z.record(z.string(), z.object({ valueKey: z.string() })),
    });
    const tool = makeZodTool('record_values', ['valueKey'], schema);
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключ допуска есть только в элементе кортежа (`prefixItems` у z.tuple под Zod 4) — проходит', () => {
    const schema = z.object({
      pair: z.tuple([z.object({ leftKey: z.string() }), z.object({ rightKey: z.string() })]),
    });
    const tool = makeZodTool('tuple_prefix_items', ['leftKey', 'rightKey'], schema);
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('ключ допуска есть только в схеме значений `patternProperties` — проходит', () => {
    const tool = makeRawTool('pattern_properties', ['patternValueKey'], {
      inputSchema: {
        type: 'object',
        properties: {
          map: {
            type: 'object',
            patternProperties: {
              '^x-': {
                type: 'object',
                properties: { patternValueKey: { type: 'string' } },
              },
            },
          },
        },
      } as unknown as ToolDefinition['inputSchema'],
    });
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });

  it('имя паттерна из `patternProperties` параметром не считается', () => {
    const tool = makeRawTool('pattern_name_is_not_a_param', ['^x-'], {
      inputSchema: {
        type: 'object',
        properties: {
          map: {
            type: 'object',
            patternProperties: {
              '^x-': { type: 'object', properties: { realKey: { type: 'string' } } },
            },
          },
        },
      } as unknown as ToolDefinition['inputSchema'],
    });
    const errors = validateRedactionAllowlist([tool]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('^x-');
  });

  it('согласованный allowlist на реальной схеме не даёт ошибок', () => {
    const schema = z.object({
      issueId: z.string(),
      comments: z.array(z.object({ text: z.string(), attachmentId: z.string().optional() })),
    });
    const tool = makeZodTool('consistent', ['issueId', 'attachmentId'], schema);
    expect(validateRedactionAllowlist([tool])).toEqual([]);
  });
});
