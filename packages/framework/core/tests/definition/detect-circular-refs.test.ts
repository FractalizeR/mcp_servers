/**
 * Тесты для детектора циклических $ref (пакет 3.1.A плана модернизации)
 *
 * Доказывает, что детектор СПОСОБЕН поймать цикл (не просто "всегда возвращает
 * false"): синтетические схемы ниже намеренно рекурсивны (self-referencing
 * z.lazy через getter), что порождает $ref-цикл в сгенерированной JSON Schema —
 * см. .agentic-planning/plan_mcp_2026_modernization/3.1_tool_contracts_parallel.md,
 * DoD пакета 3.1.A.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { detectCircularRefs } from '../../src/definition/detect-circular-refs.js';
import { zodToMcpInputSchema } from '../../src/definition/zod-json-schema-adapter.js';

describe('detectCircularRefs', () => {
  describe('положительные случаи (реальный цикл — доказательство, что детектор ловит)', () => {
    it('обнаруживает self-referencing схему (рекурсия в корень документа)', () => {
      // z.lazy через getter — Category ссылается сама на себя
      const Category: z.ZodObject<{
        name: z.ZodString;
        subcategories: z.ZodOptional<z.ZodArray<z.ZodType>>;
      }> = z.object({
        name: z.string(),
        get subcategories() {
          return z.array(Category).optional();
        },
      });

      const inputSchema = zodToMcpInputSchema(Category);
      const result = detectCircularRefs(inputSchema);

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toBeDefined();
      expect(result.cyclePath?.length).toBeGreaterThan(0);
    });

    it('обнаруживает цикл через $defs (рекурсия не в корне, а во вложенном узле)', () => {
      const Wrapper: z.ZodObject<{
        name: z.ZodString;
        children: z.ZodOptional<z.ZodArray<z.ZodType>>;
      }> = z.object({
        name: z.string(),
        get children() {
          return z.array(Wrapper).optional();
        },
      });
      const Params = z.object({ wrapper: Wrapper });

      const inputSchema = zodToMcpInputSchema(Params);
      // Подтверждаем, что цикл действительно материализовался через $defs —
      // иначе тест ничего не доказывает.
      expect(inputSchema.$defs).toBeDefined();

      const result = detectCircularRefs(inputSchema);

      expect(result.hasCycle).toBe(true);
    });

    it('обнаруживает взаимную (mutual) рекурсию A ↔ B', () => {
      // B в теле getter'а A ссылается на объявление ниже — это допустимо: getter
      // выполняется лениво (при первом обращении), а не в момент создания A, и к
      // этому моменту B уже присвоена (TDZ не мешает, т.к. обращение отложено).
      const A: z.ZodObject<{ name: z.ZodString; b: z.ZodOptional<z.ZodType> }> = z.object({
        name: z.string(),
        get b() {
          return B.optional();
        },
      });
      const B = z.object({
        value: z.number(),
        get a() {
          return A.optional();
        },
      });

      const inputSchema = zodToMcpInputSchema(A);
      const result = detectCircularRefs(inputSchema);

      expect(result.hasCycle).toBe(true);
    });

    it('напрямую ловит искусственный $ref-цикл, минуя Zod (юнит на сам алгоритм)', () => {
      // Не зависит от того, как именно Zod генерирует cycles — проверяет сам обход.
      const syntheticCyclicSchema = {
        type: 'object' as const,
        properties: {
          self: { $ref: '#' },
        },
      };

      const result = detectCircularRefs(syntheticCyclicSchema);

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toEqual(['#', '#']);
    });
  });

  describe('отрицательные случаи (не должно быть ложных срабатываний)', () => {
    it('не находит цикл в простой схеме без $ref', () => {
      const Simple = z.object({
        id: z.string(),
        tags: z.array(z.string()).optional(),
      });

      const result = detectCircularRefs(zodToMcpInputSchema(Simple));

      expect(result.hasCycle).toBe(false);
      expect(result.cyclePath).toBeUndefined();
    });

    it('не находит цикл при переиспользовании одной и той же подсхемы дважды (не рекурсия)', () => {
      const Address = z.object({ city: z.string() });
      const Person = z.object({ home: Address, work: Address });

      const result = detectCircularRefs(zodToMcpInputSchema(Person));

      expect(result.hasCycle).toBe(false);
    });

    it('не находит цикл в пустой схеме', () => {
      const Empty = z.object({});

      const result = detectCircularRefs(zodToMcpInputSchema(Empty));

      expect(result.hasCycle).toBe(false);
    });

    it('не путает глубокую вложенность (не-$ref) с циклом', () => {
      const Deep = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              level4: z.string(),
            }),
          }),
        }),
      });

      const result = detectCircularRefs(zodToMcpInputSchema(Deep));

      expect(result.hasCycle).toBe(false);
    });

    it('не считает битую ($ref в никуда) ссылку циклом', () => {
      const danglingRefSchema = {
        type: 'object' as const,
        properties: {
          broken: { $ref: '#/$defs/doesNotExist' },
        },
      };

      const result = detectCircularRefs(danglingRefSchema);

      expect(result.hasCycle).toBe(false);
    });
  });
});
