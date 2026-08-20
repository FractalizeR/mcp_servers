/**
 * Unit тесты общего контракта значения ошибки batch-элемента (этап 1.1)
 *
 * Проверяет, что `BatchErrorValueSchema`/`makeBatchErrorItemSchema` принимают ровно
 * то, что фактически кладёт `BatchResultProcessor.process()` в `failed[].error`:
 * либо строку, либо полный `ApiErrorClass.toJSON()` (`ApiErrorDetails`).
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import {
  BatchErrorValueSchema,
  makeBatchErrorItemSchema,
  makeBatchSuccessItemSchema,
  makeBatchResultSchema,
} from '#common/schemas/output.schema.js';

describe('BatchErrorValueSchema', () => {
  it('принимает строку (message обычного Error)', () => {
    const result = BatchErrorValueSchema.safeParse('Сущность не найдена (пустой результат)');

    expect(result.success).toBe(true);
  });

  it('принимает минимальный ApiErrorClass.toJSON() (только statusCode/message)', () => {
    const error = new ApiErrorClass(404, 'Issue not found');

    const result = BatchErrorValueSchema.safeParse(error.toJSON());

    expect(result.success).toBe(true);
  });

  it('принимает полный ApiErrorClass.toJSON() со всеми опциональными полями', () => {
    const error = new ApiErrorClass(
      400,
      'Validation failed',
      { summary: ['Required field'], assignee: ['Invalid user ID'] },
      60
    );

    const result = BatchErrorValueSchema.safeParse(error.toJSON());

    expect(result.success).toBe(true);
  });

  it('пропускает неизвестные ключи объекта (errorsData и будущие поля ApiErrorDetails)', () => {
    const result = BatchErrorValueSchema.safeParse({
      statusCode: 500,
      message: 'Internal error',
      errorsData: { unexpectedField: 'value', nested: { a: 1 } },
    });

    expect(result.success).toBe(true);
  });

  it('отклоняет объект без обязательных statusCode/message', () => {
    const result = BatchErrorValueSchema.safeParse({ foo: 'bar' });

    expect(result.success).toBe(false);
  });

  it('отклоняет число/null/undefined', () => {
    expect(BatchErrorValueSchema.safeParse(42).success).toBe(false);
    expect(BatchErrorValueSchema.safeParse(null).success).toBe(false);
    expect(BatchErrorValueSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('makeBatchErrorItemSchema', () => {
  it('принимает элемент со строковой ошибкой', () => {
    const schema = makeBatchErrorItemSchema('issueId');

    const result = schema.safeParse({ issueId: 'TEST-1', error: 'not found' });

    expect(result.success).toBe(true);
  });

  it('принимает элемент с объектной ошибкой (ApiErrorClass.toJSON())', () => {
    const schema = makeBatchErrorItemSchema('issueId');
    const error = new ApiErrorClass(429, 'Too many requests', undefined, 30);

    const result = schema.safeParse({ issueId: 'TEST-1', error: error.toJSON() });

    expect(result.success).toBe(true);
  });

  it('использует переданное имя ключа', () => {
    const schema = makeBatchErrorItemSchema('userId');

    const result = schema.safeParse({ userId: '123', error: 'boom' });

    expect(result.success).toBe(true);
  });
});

/**
 * DoD 1.1 п.4/5 плана plan_tool_contract_unification: `successful[]` несёт
 * идентификатор сущности на верхнем уровне элемента (не во вложенном `data`,
 * см. CLAUDE.md §2.1) — под тем же именем ключа, что и `failed[]`.
 */
describe('makeBatchSuccessItemSchema', () => {
  it('идентификатор лежит на верхнем уровне элемента рядом с данными (не data.*)', () => {
    const schema = makeBatchSuccessItemSchema('issueId', z.object({ summary: z.string() }));

    const result = schema.safeParse({ issueId: 'TEST-1', summary: 'Заголовок' });

    expect(result.success).toBe(true);
    expect(result.success && 'data' in result.data).toBe(false);
  });

  it('использует переданное имя ключа', () => {
    const schema = makeBatchSuccessItemSchema('userId', z.object({ login: z.string() }));

    const result = schema.safeParse({ userId: '123', login: 'user' });

    expect(result.success).toBe(true);
  });
});

describe('makeBatchResultSchema', () => {
  const schema = makeBatchResultSchema('issueId', z.object({ summary: z.string() }));

  it('успешный элемент и элемент ошибки используют ОДИН И ТОТ ЖЕ ключ идентификатора', () => {
    const result = schema.safeParse({
      total: 2,
      successful: [{ issueId: 'TEST-1', summary: 'Ok' }],
      failed: [{ issueId: 'TEST-2', error: 'not found' }],
    });

    expect(result.success).toBe(true);
  });

  it('total — число, successful/failed — массивы даже при полном успехе', () => {
    const result = schema.safeParse({
      total: 1,
      successful: [{ issueId: 'TEST-1', summary: 'Ok' }],
      failed: [],
    });

    expect(result.success).toBe(true);
  });

  it('total — число, successful/failed — массивы даже при полном отказе', () => {
    const result = schema.safeParse({
      total: 1,
      successful: [],
      failed: [{ issueId: 'TEST-1', error: 'boom' }],
    });

    expect(result.success).toBe(true);
  });

  it('отклоняет legacy-форму successful: number (регрессия к отчёту)', () => {
    const result = schema.safeParse({ total: 1, successful: 1, failed: [] });

    expect(result.success).toBe(false);
  });
});
