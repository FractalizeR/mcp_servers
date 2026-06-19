/**
 * Unit тесты для GetAttachmentsOperation (с пагинацией)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ServerConfig } from '#config';
import { GetAttachmentsOperation } from '#tracker_api/api_operations/attachment/get-attachments.operation.js';
import { createAttachmentListFixture } from '#helpers/attachment.fixture.js';

describe('GetAttachmentsOperation', () => {
  let operation: GetAttachmentsOperation;
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

    operation = new GetAttachmentsOperation(
      httpClient as never,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  describe('execute (single page)', () => {
    it('возвращает одну страницу без Link → hasNextPage=false, fetchedAll=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments',
        createAttachmentListFixture(2)
      );

      const result = await operation.execute('TEST-1');

      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('при наличии Link rel=next → hasNextPage=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments',
        createAttachmentListFixture(1),
        {
          link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/attachments?page=2>; rel="next"',
        }
      );

      const result = await operation.execute('TEST-1');

      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('пробрасывает ошибку API', async () => {
      await expect(operation.execute('TEST-404')).rejects.toThrow();
    });

    it('кеширует базовый запрос под каноническим ключом list:{issueId}', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments',
        createAttachmentListFixture(1)
      );

      await operation.execute('TEST-1');

      // ключ кеша не зависит от пагинации → совпадает с инвалидацией upload/delete
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
      const cacheKey = (mockCacheManager.set as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(cacheKey).toContain('list:TEST-1');
      expect(cacheKey).not.toMatch(/p=|pp=|all=|mi=/);
    });

    it('при заданных пагинационных параметрах кеш не используется', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments?page=2',
        createAttachmentListFixture(1)
      );

      await operation.execute('TEST-1', { page: 2 });

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel=next', async () => {
      httpClient.setResponseQueue('GET', '/v2/issues/TEST-1/attachments?perPage=100', [
        {
          data: createAttachmentListFixture(1),
          headers: {
            link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/attachments?page=2>; rel="next"',
          },
        },
      ]);
      httpClient.setResponseQueue('GET', '/v2/issues/TEST-1/attachments?page=2', [
        { data: createAttachmentListFixture(1) },
      ]);

      const result = await operation.execute('TEST-1', { fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(2);
    });

    it('обрезает выдачу по maxItems → truncated=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments?perPage=100',
        createAttachmentListFixture(3),
        {
          link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/attachments?page=2>; rel="next"',
        }
      );

      const result = await operation.execute('TEST-1', { fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
    });
  });

  describe('executeMany', () => {
    it('возвращает BatchResult с PaginatedResult в value', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments',
        createAttachmentListFixture(2)
      );
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-2/attachments',
        createAttachmentListFixture(1)
      );

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value.items).toHaveLength(2);
        expect(results[0].value.pagination.fetchedAll).toBe(true);
      }
    });

    it('обрабатывает частичные ошибки', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/attachments',
        createAttachmentListFixture(1)
      );

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('возвращает пустой массив для пустого входа', async () => {
      const results = await operation.executeMany([]);

      expect(results).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'GetAttachmentsOperation: пустой массив issueIds'
      );
    });
  });
});
