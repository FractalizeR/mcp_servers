/**
 * Unit тесты для RawApiRequestParamsSchema (Yandex Wiki)
 */

import { describe, it, expect } from 'vitest';
import { RawApiRequestParamsSchema } from '#tools/api/raw/raw-api-request.schema.js';

describe('RawApiRequestParamsSchema (wiki)', () => {
  const valid = { method: 'GET', path: '/v1/pages/123', fields: ['id'] };

  it('должна принять валидный GET-запрос', () => {
    expect(RawApiRequestParamsSchema.safeParse(valid).success).toBe(true);
  });

  it('должна принять query с разными типами значений', () => {
    const result = RawApiRequestParamsSchema.safeParse({
      ...valid,
      query: { fields: 'content', revision_id: 7, raise_on_redirect: true, ids: ['1', '2'] },
    });
    expect(result.success).toBe(true);
  });

  it('должна отклонить путь без префикса /v1/', () => {
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/pages/123' }).success).toBe(
      false
    );
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v2/pages/123' }).success).toBe(
      false
    );
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v3/pages/123' }).success).toBe(
      false
    );
  });

  it('должна отклонить абсолютный URL', () => {
    const result = RawApiRequestParamsSchema.safeParse({
      ...valid,
      path: 'https://evil.example.com/v1/pages',
    });
    expect(result.success).toBe(false);
  });

  it('должна отклонить path traversal (..)', () => {
    for (const path of ['/v1/../../admin', '/v1/pages/../../../secret', '/v1/..']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('должна отклонить query-строку в path (? и #)', () => {
    expect(
      RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v1/pages?fields=content' }).success
    ).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v1/pages#frag' }).success).toBe(
      false
    );
  });

  it('должна отклонить управляющие символы и пробелы в path', () => {
    for (const path of ['/v1/pages\n/v9/x', '/v1/pa ges', '/v1/pages%2f..%2fadmin']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('должна принять валидные сегменты пути (буквы, цифры, дефис, слеш)', () => {
    for (const path of ['/v1/pages/123', '/v1/pages/123/resources', '/v1/pages']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(true);
    }
  });

  it('должна отклонить метод, отличный от GET', () => {
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, method: 'POST' }).success).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, method: 'DELETE' }).success).toBe(false);
  });

  it('должна требовать непустой fields', () => {
    expect(
      RawApiRequestParamsSchema.safeParse({ method: 'GET', path: '/v1/pages/123' }).success
    ).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, fields: [] }).success).toBe(false);
  });
});
