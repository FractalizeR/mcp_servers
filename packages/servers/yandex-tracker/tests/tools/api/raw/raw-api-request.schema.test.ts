/**
 * Unit тесты для RawApiRequestParamsSchema
 */

import { describe, it, expect } from 'vitest';
import { RawApiRequestParamsSchema } from '#tools/api/raw/raw-api-request.schema.js';

describe('RawApiRequestParamsSchema', () => {
  const valid = { method: 'GET', path: '/v3/issues/QUEUE-1', fields: ['key'] };

  it('должна принять валидный GET-запрос', () => {
    expect(RawApiRequestParamsSchema.safeParse(valid).success).toBe(true);
  });

  it('должна принять query с разными типами значений', () => {
    const result = RawApiRequestParamsSchema.safeParse({
      ...valid,
      query: { expand: 'transitions', perPage: 50, withDeleted: true, ids: ['1', '2'] },
    });
    expect(result.success).toBe(true);
  });

  it('должна отклонить путь без префикса /v2/ или /v3/', () => {
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/issues' }).success).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v1/issues' }).success).toBe(
      false
    );
  });

  it('должна отклонить абсолютный URL', () => {
    const result = RawApiRequestParamsSchema.safeParse({
      ...valid,
      path: 'https://evil.example.com/v3/issues',
    });
    expect(result.success).toBe(false);
  });

  it('должна отклонить path traversal (..)', () => {
    for (const path of ['/v3/../../admin', '/v3/issues/../../../secret', '/v2/..']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('должна отклонить query-строку в path (? и #)', () => {
    expect(
      RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v3/issues?perPage=1' }).success
    ).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/v3/issues#frag' }).success).toBe(
      false
    );
  });

  it('должна отклонить управляющие символы и пробелы в path', () => {
    for (const path of ['/v3/issues\n/v9/x', '/v3/iss ues', '/v3/issues%2f..%2fadmin']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('должна принять валидные сегменты пути (буквы, цифры, дефис, слеш)', () => {
    for (const path of ['/v3/issues/QUEUE-1', '/v3/issues/QUEUE-1/transitions', '/v2/projects']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(true);
    }
  });

  it('должна отклонить метод, отличный от GET', () => {
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, method: 'POST' }).success).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, method: 'DELETE' }).success).toBe(false);
  });

  it('должна требовать непустой fields', () => {
    expect(RawApiRequestParamsSchema.safeParse({ method: 'GET', path: '/v3/myself' }).success).toBe(
      false
    );
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, fields: [] }).success).toBe(false);
  });
});
