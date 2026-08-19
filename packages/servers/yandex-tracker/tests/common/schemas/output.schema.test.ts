/**
 * Unit тесты общего контракта значения ошибки batch-элемента (этап 1.1)
 *
 * Проверяет, что `BatchErrorValueSchema`/`makeBatchErrorItemSchema` принимают ровно
 * то, что фактически кладёт `BatchResultProcessor.process()` в `failed[].error`:
 * либо строку, либо полный `ApiErrorClass.toJSON()` (`ApiErrorDetails`).
 */

import { describe, it, expect } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import { BatchErrorValueSchema, makeBatchErrorItemSchema } from '#common/schemas/output.schema.js';

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
