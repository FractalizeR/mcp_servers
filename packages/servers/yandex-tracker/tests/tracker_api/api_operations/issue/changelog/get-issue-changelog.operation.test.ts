import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueChangelogOperation } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import { CursorCodec, CURSOR_TAGS, InvalidCursorError } from '#tracker_api/utils/index.js';

/**
 * Хелпер: одна минимальная запись истории.
 */
function makeEntry(id: string, issueKey: string): ChangelogEntryWithUnknownFields {
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/${issueKey}/changelog/${id}`,
    issue: { id: id, key: issueKey, display: 'Test Issue' },
    updatedAt: '2024-01-01T10:00:00.000Z',
    updatedBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
    type: 'IssueUpdated',
    fields: [],
  };
}

describe('GetIssueChangelogOperation (pagination)', () => {
  let operation: GetIssueChangelogOperation;
  let httpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

  beforeEach(() => {
    httpClient = new MockHttpClient();

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    mockConfig = {
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      token: 'test-token',
      orgId: 'test-org',
    } as ServerConfig;

    operation = new GetIssueChangelogOperation(
      httpClient,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  it('возвращает пустой массив для пустого массива ключей', async () => {
    const result = await operation.execute([]);

    expect(result).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'GetIssueChangelogOperation: пустой массив ключей'
    );
  });

  it('single-page без Link → hasNextPage=false, fetchedAll=true', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?perPage=50', [
      makeEntry('1', 'TEST-1'),
    ]);

    const result = await operation.execute(['TEST-1']);

    expect(result).toHaveLength(1);
    const first = result[0];
    expect(first?.status).toBe('fulfilled');
    if (first?.status === 'fulfilled') {
      expect(first.value.items).toHaveLength(1);
      expect(first.value.pagination.hasNextPage).toBe(false);
      expect(first.value.pagination.fetchedAll).toBe(true);
      expect(first.value.pagination.pagesFetched).toBe(1);
    }
  });

  it('РЕГРЕССИЯ (план 3.3/3.4): без явного perPage, одна запись, Link rel=next всё равно есть → hasNextPage=false', async () => {
    // До пакета 3.4 операция не слала perPage сама, buildMeta не мог свериться
    // с числом элементов, и hasNextPage ложно оставался true. Теперь операция
    // всегда шлёт DEFAULT_PER_PAGE=50 явно, поэтому 1 запись < 50 гасит
    // hasNextPage несмотря на Link — тот же F3-механизм, что и в get_comments.
    httpClient.setResponse(
      'GET',
      '/v3/issues/TEST-1/changelog?perPage=50',
      [makeEntry('1', 'TEST-1')],
      {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/changelog?page=2>; rel="next"',
      }
    );

    const result = await operation.execute(['TEST-1']);

    const first = result[0];
    if (first?.status === 'fulfilled') {
      expect(first.value.items).toHaveLength(1);
      expect(first.value.pagination.hasNextPage).toBe(false);
      expect(first.value.pagination.fetchedAll).toBe(true);
    } else {
      throw new Error('expected fulfilled');
    }
  });

  it('single-page: страница заполнена ровно до perPage + Link rel=next → hasNextPage=true', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => makeEntry(String(i + 1), 'TEST-1'));
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?perPage=50', fullPage, {
      link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/changelog?page=2>; rel="next"',
    });

    const result = await operation.execute(['TEST-1']);

    const first = result[0];
    if (first?.status === 'fulfilled') {
      expect(first.value.pagination.hasNextPage).toBe(true);
      expect(first.value.pagination.fetchedAll).toBe(false);
    } else {
      throw new Error('expected fulfilled');
    }
  });

  it('single-page прокидывает perPage в endpoint и метаданные (без page)', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?perPage=50', [
      makeEntry('1', 'TEST-1'),
    ]);

    const result = await operation.execute(['TEST-1'], { perPage: 50 });

    const first = result[0];
    expect(first?.status).toBe('fulfilled');
    if (first?.status === 'fulfilled') {
      // page больше не отдаётся в cursor-режиме
      expect(first.value.pagination.page).toBeUndefined();
      expect(first.value.pagination.perPage).toBe(50);
    }
    expect(httpClient.getRequestHistory()).toContainEqual(
      expect.objectContaining({ path: '/v3/issues/TEST-1/changelog?perPage=50' })
    );
  });

  it('single-page с rel=next отдаёт nextCursor, декодируемый в next-путь', async () => {
    // perPage=1 явно передан агентом и совпадает с числом элементов
    // страницы — sanity-check (F3) не гасит hasNextPage/nextCursor.
    httpClient.setResponse(
      'GET',
      '/v3/issues/TEST-1/changelog?perPage=1',
      [makeEntry('1', 'TEST-1')],
      {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/changelog?id=NEXT>; rel="next"',
      }
    );

    const result = await operation.execute(['TEST-1'], { perPage: 1 });

    const first = result[0];
    if (first?.status !== 'fulfilled') {
      throw new Error('expected fulfilled');
    }
    const cursor = first.value.pagination.nextCursor;
    expect(cursor).toBeDefined();
    expect(CursorCodec.decode(cursor!, CURSOR_TAGS.changelog).path).toBe(
      '/v3/issues/TEST-1/changelog?id=NEXT'
    );
  });

  it('cursor-режим: листание по nextCursor возвращает следующие записи', async () => {
    // perPage=1 явно передан агентом и совпадает с числом элементов первой
    // страницы — sanity-check (F3) не гасит hasNextPage/nextCursor.
    httpClient.setResponse(
      'GET',
      '/v3/issues/TEST-1/changelog?perPage=1',
      [makeEntry('1', 'TEST-1')],
      {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/changelog?id=NEXT>; rel="next"',
      }
    );
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?id=NEXT', [
      makeEntry('2', 'TEST-1'),
    ]);

    const firstBatch = await operation.execute(['TEST-1'], { perPage: 1 });
    const first = firstBatch[0];
    if (first?.status !== 'fulfilled') {
      throw new Error('expected fulfilled');
    }
    const cursor = first.value.pagination.nextCursor;
    expect(CursorCodec.decode(cursor!, CURSOR_TAGS.changelog).path).toBe(
      '/v3/issues/TEST-1/changelog?id=NEXT'
    );

    const secondBatch = await operation.execute(['TEST-1'], { cursor });
    const second = secondBatch[0];
    if (second?.status !== 'fulfilled') {
      throw new Error('expected fulfilled');
    }
    expect(second.value.items.map((e) => e.id)).toEqual(['2']);
    expect(httpClient.getRequestHistory()).toContainEqual(
      expect.objectContaining({ method: 'GET', path: '/v3/issues/TEST-1/changelog?id=NEXT' })
    );
  });

  it('cursor-режим: битый курсор → InvalidCursorError', async () => {
    const result = await operation.execute(['TEST-1'], { cursor: 'bad' });

    // execute оборачивает per-issue ошибки в rejected (ParallelExecutor),
    // причина — InvalidCursorError.
    const first = result[0];
    expect(first?.status).toBe('rejected');
    if (first?.status === 'rejected') {
      expect(first.reason).toBeInstanceOf(InvalidCursorError);
    }
  });

  it('fetchAll обходит несколько страниц через Link rel=next', async () => {
    // Стартовая страница (perPage поднимается к 100 → path с query)
    httpClient.setResponse(
      'GET',
      '/v3/issues/TEST-1/changelog?perPage=100',
      [makeEntry('1', 'TEST-1')],
      {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/changelog?page=2>; rel="next"',
      }
    );
    // Вторая страница (по next-URL)
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?page=2', [makeEntry('2', 'TEST-1')]);

    const result = await operation.execute(['TEST-1'], { fetchAll: true });

    const first = result[0];
    if (first?.status === 'fulfilled') {
      expect(first.value.items).toHaveLength(2);
      expect(first.value.pagination.pagesFetched).toBe(2);
      expect(first.value.pagination.fetchedAll).toBe(true);
      expect(first.value.pagination.hasNextPage).toBe(false);
    } else {
      throw new Error('expected fulfilled');
    }
  });

  it('fetchAll обрезает результат по maxItems (truncated=true)', async () => {
    httpClient.setResponse(
      'GET',
      '/v3/issues/TEST-1/changelog?perPage=100',
      [makeEntry('1', 'TEST-1'), makeEntry('2', 'TEST-1')],
      {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/changelog?page=2>; rel="next"',
      }
    );

    const result = await operation.execute(['TEST-1'], { fetchAll: true, maxItems: 1 });

    const first = result[0];
    if (first?.status === 'fulfilled') {
      expect(first.value.items).toHaveLength(1);
      expect(first.value.pagination.truncated).toBe(true);
      expect(first.value.pagination.fetchedAll).toBe(false);
    } else {
      throw new Error('expected fulfilled');
    }
  });

  it('обрабатывает частичные ошибки (одна задача падает)', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?perPage=50', [
      makeEntry('1', 'TEST-1'),
    ]);
    // Для INVALID-999 мок-ответ не настроен → reject

    const result = await operation.execute(['TEST-1', 'INVALID-999']);

    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe('fulfilled');
    expect(result[1]?.status).toBe('rejected');
  });

  it('использует getWithResponse по корректному пути', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-123/changelog?perPage=50', []);

    await operation.execute(['TEST-123']);

    const history = httpClient.getRequestHistory();
    expect(
      history.some(
        (r) => r.method === 'GET' && r.path === '/v3/issues/TEST-123/changelog?perPage=50'
      )
    ).toBe(true);
  });
});
