/**
 * Unit тесты для GetIssueLinksOperation (batch + пагинация)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ServerConfig } from '#config';
import { GetIssueLinksOperation } from '#tracker_api/api_operations/link/get-issue-links.operation.js';
import { createLinkListFixture } from '#helpers/link.fixture.js';

describe('GetIssueLinksOperation', () => {
  let operation: GetIssueLinksOperation;
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
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    } as ServerConfig;

    operation = new GetIssueLinksOperation(
      httpClient as never,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  describe('execute (batch, single page)', () => {
    it('возвращает BatchResult с PaginatedResult; без Link → fetchedAll=true', async () => {
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links', createLinkListFixture(3));

      const results = await operation.execute(['TEST-1']);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value.items).toHaveLength(3);
        expect(results[0].value.pagination.hasNextPage).toBe(false);
        expect(results[0].value.pagination.fetchedAll).toBe(true);
      }
    });

    it('при наличии Link rel=next → hasNextPage=true', async () => {
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links', createLinkListFixture(1), {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
      });

      const results = await operation.execute(['TEST-1']);

      if (results[0].status === 'fulfilled') {
        expect(results[0].value.pagination.hasNextPage).toBe(true);
      }
    });

    it('обрабатывает несколько задач и частичные ошибки', async () => {
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links', createLinkListFixture(2));
      // TEST-2 не замокан → rejected

      const results = await operation.execute(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('возвращает пустой массив для пустого входа', async () => {
      const results = await operation.execute([]);

      expect(results).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('GetIssueLinksOperation: пустой массив ключей');
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel=next', async () => {
      httpClient.setResponseQueue('GET', '/v3/issues/TEST-1/links?perPage=100', [
        {
          data: createLinkListFixture(1),
          headers: {
            link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
          },
        },
      ]);
      httpClient.setResponseQueue('GET', '/v3/issues/TEST-1/links?page=2', [
        { data: createLinkListFixture(1) },
      ]);

      const results = await operation.execute(['TEST-1'], { fetchAll: true });

      if (results[0].status === 'fulfilled') {
        expect(results[0].value.items).toHaveLength(2);
        expect(results[0].value.pagination.fetchedAll).toBe(true);
        expect(results[0].value.pagination.pagesFetched).toBe(2);
      }
    });

    it('обрезает выдачу по maxItems → truncated=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/links?perPage=100',
        createLinkListFixture(3),
        {
          link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
        }
      );

      const results = await operation.execute(['TEST-1'], { fetchAll: true, maxItems: 2 });

      if (results[0].status === 'fulfilled') {
        expect(results[0].value.items).toHaveLength(2);
        expect(results[0].value.pagination.truncated).toBe(true);
      }
    });
  });
});
