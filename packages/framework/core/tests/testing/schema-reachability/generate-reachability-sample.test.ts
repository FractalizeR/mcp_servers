/**
 * Тесты `generateReachabilitySample()` (пакет 7.1.E плана модернизации MCP
 * 2026-07-28) — сведённый генератор образцов для проверки достижимости
 * параметров (заменяет прежние дубли Трекера/Wiki).
 *
 * Ключевой сценарий, ради которого затевался вынос: булевы поля обязаны
 * различаться через пару "имя+значение" (`kind: 'boolean'`), а не голое
 * значение `true` — это та самая тонкость, на которой первая версия
 * Трекер-теста ошибалась (см. заголовок generate-reachability-sample.ts).
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { generateReachabilitySample } from '../../../src/testing/schema-reachability/generate-reachability-sample.js';

describe('generateReachabilitySample', () => {
  it('генерирует значения для обязательных и опциональных полей верхнего уровня', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const { value, leaves } = generateReachabilitySample(schema);

    expect(value).toHaveProperty('required');
    expect(value).toHaveProperty('optional');
    expect(leaves.has('required')).toBe(true);
    expect(leaves.has('optional')).toBe(true);
  });

  it('трекает полный путь вложенных полей (не только верхний уровень)', () => {
    const schema = z.object({
      outer: z.object({
        inner: z.string(),
      }),
    });

    const { leaves } = generateReachabilitySample(schema);

    expect(leaves.has('outer.inner')).toBe(true);
  });

  it('элементы массива получают путь с суффиксом []', () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.string() })),
    });

    const { leaves } = generateReachabilitySample(schema);

    expect(leaves.has('items[].id')).toBe(true);
  });

  it('record: значение генерируется под маркерным ключом markerKey', () => {
    const schema = z.object({
      customFields: z.record(z.string(), z.unknown()),
    });

    const { value, leaves } = generateReachabilitySample(schema);

    const customFields = (value as { customFields: Record<string, unknown> }).customFields;
    expect(Object.keys(customFields)).toEqual(['markerKey']);
    expect(leaves.has('customFields.markerKey')).toBe(true);
  });

  describe('boolean — тонкость плана 7.1.E (пара имя+значение, не голое true)', () => {
    it('boolean-поле помечается kind:"boolean", а не "scalar"', () => {
      const schema = z.object({ isSilent: z.boolean() });
      const { leaves } = generateReachabilitySample(schema);

      const leaf = leaves.get('isSilent');
      expect(leaf?.kind).toBe('boolean');
      expect(leaf?.fieldName).toBe('isSilent');
    });

    it('z.literal(true)/z.literal(false) тоже помечаются kind:"boolean"', () => {
      const schema = z.object({
        onlyTrue: z.literal(true),
        onlyFalse: z.literal(false),
      });
      const { leaves } = generateReachabilitySample(schema);

      expect(leaves.get('onlyTrue')?.kind).toBe('boolean');
      expect(leaves.get('onlyFalse')?.kind).toBe('boolean');
      expect(leaves.get('onlyFalse')?.value).toBe('false');
    });
  });

  describe('строки с ограничениями', () => {
    it('regex без knownRegexSamples — понятная ошибка, а не тихая генерация невалидного значения', () => {
      const schema = z.object({ issueKey: z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/) });

      expect(() => generateReachabilitySample(schema)).toThrow(/pattern/);
    });

    it('regex с knownRegexSamples — использует образец из карты', () => {
      const pattern = /^[A-Z][A-Z0-9]+-\d+$/;
      const schema = z.object({ issueKey: z.string().regex(pattern) });

      const { value } = generateReachabilitySample(schema, {
        knownRegexSamples: new Map([[pattern.source, 'TEST-1']]),
      });

      expect((value as { issueKey: string }).issueKey).toBe('TEST-1');
    });

    it('известный format (uuid) получает встроенный валидный образец без доп. настройки', () => {
      const schema = z.object({ idx: z.string().uuid() });
      const { value } = generateReachabilitySample(schema);

      expect((value as { idx: string }).idx).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('knownFieldSamples побеждает generic-генерацию для доменных форматов (пример: ISO8601 duration)', () => {
      const schema = z.object({ duration: z.string() });
      const { value } = generateReachabilitySample(schema, {
        knownFieldSamples: new Map([['duration', 'PT1H30M']]),
      });

      expect((value as { duration: string }).duration).toBe('PT1H30M');
    });

    it('knownFieldSamples с числовым значением подставляется в число, ограниченное .refine() (регрессия TickTick priority)', () => {
      // .refine() ограничивает значения дискретным множеством, которое
      // z.toJSONSchema не выражает — без knownFieldSamples generic-генератор
      // выдал бы произвольное число, отклонённое ЭТИМ ЖЕ refine при
      // validateParams() тула ДО похода в HTTP (найдено эмпирически на
      // TickTick GetTasksByPriorityTool: priority ∈ {0,1,3,5}).
      const prioritySchema = z
        .number()
        .int()
        .refine((v) => [0, 1, 3, 5].includes(v), { message: 'invalid priority' });
      const schema = z.object({ priority: prioritySchema });

      const { value } = generateReachabilitySample(schema, {
        knownFieldSamples: new Map([['priority', 3]]),
      });

      expect((value as { priority: number }).priority).toBe(3);
      expect(schema.safeParse(value).success).toBe(true);
    });

    it('knownFieldSamples со строковым значением НЕ применяется к числовому полю с тем же именем', () => {
      // Регрессия: если карта содержит строку для имени поля, а поле само
      // число (.refine поверх z.number()), generic-числовая генерация
      // обязана продолжить работать, а не упасть на typeof-несовпадении.
      const schema = z.object({ priority: z.number().min(0).max(5) });
      const { value } = generateReachabilitySample(schema, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        knownFieldSamples: new Map([['priority', 'not-a-number' as any]]),
      });

      expect(typeof (value as { priority: unknown }).priority).toBe('number');
    });

    it('minLength/maxLength соблюдаются в generic-образце', () => {
      const schema = z.object({ code: z.string().min(10).max(12) });
      const { value } = generateReachabilitySample(schema);

      const code = (value as { code: string }).code;
      expect(code.length).toBeGreaterThanOrEqual(10);
      expect(code.length).toBeLessThanOrEqual(12);
    });
  });

  describe('числа с ограничениями', () => {
    it('генерируемое число уважает min/max', () => {
      const schema = z.object({ count: z.number().min(1).max(5) });
      const { value } = generateReachabilitySample(schema);

      const count = (value as { count: number }).count;
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(5);
    });

    it('integer-схема округляет значение', () => {
      const schema = z.object({ count: z.number().int().min(1).max(1000) });
      const { value } = generateReachabilitySample(schema);

      expect(Number.isInteger((value as { count: number }).count)).toBe(true);
    });
  });

  it('enum: берёт первое значение и помечает его leaf как scalar', () => {
    const schema = z.object({ status: z.enum(['open', 'closed']) });
    const { value, leaves } = generateReachabilitySample(schema);

    expect((value as { status: string }).status).toBe('open');
    expect(leaves.get('status')?.kind).toBe('scalar');
  });

  it('union: генерирует по первому варианту', () => {
    const schema = z.object({ id: z.union([z.string(), z.number()]) });
    const { value } = generateReachabilitySample(schema);

    expect(typeof (value as { id: unknown }).id).toBe('string');
  });

  it('неподдерживаемый тип схемы бросает понятную ошибку (fail-fast, не молчаливая деградация)', () => {
    // z.date() сознательно не поддержан генератором — типичный «недостающий кейс».
    const schema = z.object({ createdAt: z.date() });

    expect(() => generateReachabilitySample(schema)).toThrow(/неподдерживаемый тип/);
  });
});
