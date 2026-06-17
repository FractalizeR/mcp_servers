/**
 * Unit tests for RawApiRequestParamsSchema (TickTick)
 */

import { describe, it, expect } from 'vitest';
import { RawApiRequestParamsSchema } from '#tools/api/raw/raw-api-request.schema.js';

describe('RawApiRequestParamsSchema (TickTick)', () => {
  const valid = { method: 'GET', path: '/project/proj-1/data', fields: ['id'] };

  it('should accept a valid GET request', () => {
    expect(RawApiRequestParamsSchema.safeParse(valid).success).toBe(true);
  });

  it('should accept query with different value types', () => {
    const result = RawApiRequestParamsSchema.safeParse({
      ...valid,
      query: { limit: 50, status: 'active', completed: true, ids: ['1', '2'] },
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid TickTick paths (no version prefix)', () => {
    for (const path of [
      '/project',
      '/project/proj-1',
      '/project/proj-1/data',
      '/project/proj-1/task/task-2',
    ]) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(true);
    }
  });

  it('should reject an absolute URL', () => {
    const result = RawApiRequestParamsSchema.safeParse({
      ...valid,
      path: 'https://evil.example.com/project',
    });
    expect(result.success).toBe(false);
  });

  it('should reject path traversal (..)', () => {
    for (const path of ['/project/../../admin', '/project/proj-1/../../../secret', '/..']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('should reject protocol-relative URL (//host) — SSRF/token leak', () => {
    for (const path of ['//evil.example.com/steal', '//evil.example.com/open/v1/project']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('should reject a query string in path (? and #)', () => {
    expect(
      RawApiRequestParamsSchema.safeParse({ ...valid, path: '/project?limit=1' }).success
    ).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/project#frag' }).success).toBe(
      false
    );
  });

  it('should reject control characters and spaces in path', () => {
    for (const path of ['/project\n/x', '/proj ect', '/project%2f..%2fadmin']) {
      expect(RawApiRequestParamsSchema.safeParse({ ...valid, path }).success).toBe(false);
    }
  });

  it('should reject an empty path', () => {
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '/' }).success).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, path: '' }).success).toBe(false);
  });

  it('should reject a method other than GET', () => {
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, method: 'POST' }).success).toBe(false);
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, method: 'DELETE' }).success).toBe(false);
  });

  it('should require a non-empty fields array', () => {
    expect(RawApiRequestParamsSchema.safeParse({ method: 'GET', path: '/project' }).success).toBe(
      false
    );
    expect(RawApiRequestParamsSchema.safeParse({ ...valid, fields: [] }).success).toBe(false);
  });
});
