import { describe, expect, it } from 'vitest';
import { createRawApiRequestSchema } from '../../../src/tools/raw/raw-api.schema.js';
import { FieldsSchema } from '../../../src/tools/common/schemas/fields.schema.js';

describe('createRawApiRequestSchema', () => {
  // Паттерн в духе tracker для проверки фабрики
  const schema = createRawApiRequestSchema({
    pathPattern: /^\/v[23]\/[\w.~/-]*$/,
    pathExample: '/v3/issues/QUEUE-1',
    fieldsSchema: FieldsSchema,
  });

  const valid = { method: 'GET', path: '/v3/issues/QUEUE-1', fields: ['key'] };

  it('принимает валидный GET-запрос', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('принимает query с разными типами (включая массив)', () => {
    expect(
      schema.safeParse({
        ...valid,
        query: { expand: ['a', 'b'], perPage: 50, flag: true, q: 'x' },
      }).success
    ).toBe(true);
  });

  it('отклоняет метод, отличный от GET', () => {
    expect(schema.safeParse({ ...valid, method: 'POST' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, method: 'DELETE' }).success).toBe(false);
  });

  it('отклоняет путь не по паттерну', () => {
    expect(schema.safeParse({ ...valid, path: '/v1/issues' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, path: '/issues' }).success).toBe(false);
  });

  it('отклоняет абсолютный URL', () => {
    expect(schema.safeParse({ ...valid, path: 'https://evil.example/v3/x' }).success).toBe(false);
  });

  it('отклоняет протокол-относительный URL (//host) — SSRF/утечка токена', () => {
    // Даже если pathPattern сервера допускает //, core-refine обязан отсечь
    const openSchema = createRawApiRequestSchema({
      pathPattern: /^\/[\w.~/-]+$/, // «открытый» паттерн в духе ticktick
      pathExample: '/project/{id}/data',
      fieldsSchema: FieldsSchema,
    });
    for (const path of ['//evil.example/steal', '//evil.example/open/v1/project']) {
      expect(openSchema.safeParse({ method: 'GET', path, fields: ['id'] }).success).toBe(false);
    }
    // Легитимный ticktick-путь по «открытому» паттерну проходит
    expect(
      openSchema.safeParse({ method: 'GET', path: '/project/abc/data', fields: ['id'] }).success
    ).toBe(true);
  });

  it('отклоняет path traversal (..)', () => {
    expect(schema.safeParse({ ...valid, path: '/v3/../../admin' }).success).toBe(false);
  });

  it('отклоняет query-строку и спецсимволы в пути', () => {
    expect(schema.safeParse({ ...valid, path: '/v3/issues?perPage=1' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, path: '/v3/iss ues' }).success).toBe(false);
  });

  it('требует непустой fields', () => {
    expect(schema.safeParse({ method: 'GET', path: '/v3/myself' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, fields: [] }).success).toBe(false);
  });

  it('кастомный паттерн (wiki-стиль) работает', () => {
    const wikiSchema = createRawApiRequestSchema({
      pathPattern: /^\/v1\/[\w.~/-]*$/,
      pathExample: '/v1/pages/123',
      fieldsSchema: FieldsSchema,
    });
    expect(
      wikiSchema.safeParse({ method: 'GET', path: '/v1/pages/123', fields: ['id'] }).success
    ).toBe(true);
    expect(
      wikiSchema.safeParse({ method: 'GET', path: '/v3/issues', fields: ['id'] }).success
    ).toBe(false);
  });
});
