/**
 * Unit тесты paginatedFieldFilter + интеграция с BatchResultProcessor (этап 1.3, DP-3 A)
 */

import { describe, it, expect } from 'vitest';
import { BatchResultProcessor } from '@fractalizer/mcp-core';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { paginatedFieldFilter } from '#tracker_api/utils/paginated-field-filter.util.js';
import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/index.js';

interface Entry {
  id: string;
  text: string;
  extra: string;
}

const meta = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
  hasNextPage: false,
  fetchedAll: true,
  truncated: false,
  hasError: false,
  pagesFetched: 1,
  ...overrides,
});

const page = (items: Entry[], m: Partial<PaginationMeta> = {}): PaginatedResult<Entry> => ({
  items,
  pagination: meta(m),
});

describe('paginatedFieldFilter', () => {
  it('фильтрует поля items и прокидывает pagination без изменений', () => {
    const pagination = meta({ hasNextPage: true, total: 42 });
    const filter = paginatedFieldFilter<Entry>(['id', 'text']);

    const result = filter({
      items: [{ id: '1', text: 'a', extra: 'drop' }],
      pagination,
    });

    expect(result.items).toEqual([{ id: '1', text: 'a' }]);
    expect(result.pagination).toBe(pagination);
  });

  it('возвращает объект (не массив) при пустых items', () => {
    const result = paginatedFieldFilter<Entry>(['id'])(page([]));
    expect(result.items).toEqual([]);
    expect(result.pagination.fetchedAll).toBe(true);
  });
});

describe('BatchResultProcessor + paginatedFieldFilter', () => {
  it('применяет фильтр к items, сохраняет pagination для каждой задачи', () => {
    const results: BatchResult<string, PaginatedResult<Entry>> = [
      {
        status: 'fulfilled',
        key: 'TEST-1',
        index: 0,
        value: page([{ id: '1', text: 'a', extra: 'drop' }], { hasNextPage: true }),
      },
    ];

    const processed = BatchResultProcessor.process(results, paginatedFieldFilter<Entry>(['id']));

    expect(processed.successful).toHaveLength(1);
    expect(processed.successful[0]?.data.items).toEqual([{ id: '1' }]);
    expect(processed.successful[0]?.data.pagination.hasNextPage).toBe(true);
    expect(processed.failed).toHaveLength(0);
  });

  it('задача с 0 записей остаётся в successful, не уезжает в failed', () => {
    const results: BatchResult<string, PaginatedResult<Entry>> = [
      { status: 'fulfilled', key: 'EMPTY-1', index: 0, value: page([]) },
    ];

    const processed = BatchResultProcessor.process(results, paginatedFieldFilter<Entry>(['id']));

    expect(processed.failed).toHaveLength(0);
    expect(processed.successful).toHaveLength(1);
    expect(processed.successful[0]?.data.items).toEqual([]);
  });

  it('rejected-задача попадает в failed', () => {
    const results: BatchResult<string, PaginatedResult<Entry>> = [
      { status: 'rejected', key: 'FAIL-1', index: 0, reason: new Error('boom') },
    ];

    const processed = BatchResultProcessor.process(results, paginatedFieldFilter<Entry>(['id']));

    expect(processed.successful).toHaveLength(0);
    expect(processed.failed).toHaveLength(1);
    expect(processed.failed[0]?.error).toBe('boom');
  });
});
