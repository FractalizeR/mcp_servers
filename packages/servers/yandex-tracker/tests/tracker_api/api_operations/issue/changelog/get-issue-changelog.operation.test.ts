import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueChangelogOperation } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';

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
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog', [makeEntry('1', 'TEST-1')]);

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

  it('single-page с Link rel=next → hasNextPage=true', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog', [makeEntry('1', 'TEST-1')], {
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

  it('single-page прокидывает page в endpoint и метаданные (регрессия)', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog?page=2&perPage=50', [
      makeEntry('1', 'TEST-1'),
    ]);

    const result = await operation.execute(['TEST-1'], { page: 2, perPage: 50 });

    const first = result[0];
    expect(first?.status).toBe('fulfilled');
    if (first?.status === 'fulfilled') {
      expect(first.value.pagination.page).toBe(2);
      expect(first.value.pagination.perPage).toBe(50);
    }
    expect(httpClient.getRequestHistory()).toContainEqual(
      expect.objectContaining({ path: '/v3/issues/TEST-1/changelog?page=2&perPage=50' })
    );
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
    httpClient.setResponse('GET', '/v3/issues/TEST-1/changelog', [makeEntry('1', 'TEST-1')]);
    // Для INVALID-999 мок-ответ не настроен → reject

    const result = await operation.execute(['TEST-1', 'INVALID-999']);

    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe('fulfilled');
    expect(result[1]?.status).toBe('rejected');
  });

  it('использует getWithResponse по корректному пути', async () => {
    httpClient.setResponse('GET', '/v3/issues/TEST-123/changelog', []);

    await operation.execute(['TEST-123']);

    const history = httpClient.getRequestHistory();
    expect(
      history.some((r) => r.method === 'GET' && r.path === '/v3/issues/TEST-123/changelog')
    ).toBe(true);
  });
});
