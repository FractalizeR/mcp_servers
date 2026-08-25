/**
 * Unit тесты для GetAttachmentsOperation
 *
 * Эндпоинт НЕ пагинируется — операция делает один запрос и возвращает все
 * вложения. Проверяется единственный запрос, кеш под каноническим ключом и
 * batch-режим.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ServerConfig } from '#config';
import { GetAttachmentsOperation } from '#tracker_api/api_operations/attachment/get-attachments.operation.js';
import { createAttachmentListFixture } from '#helpers/attachment.fixture.js';
import { itemAt } from '#helpers/tool-result.helper.js';

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

  describe('execute', () => {
    it('делает один запрос и возвращает все вложения (hasNextPage=false)', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/attachments',
        createAttachmentListFixture(3)
      );

      const result = await operation.execute('TEST-1');

      const history = httpClient.getRequestHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ method: 'GET', path: '/v3/issues/TEST-1/attachments' });
      expect(result.items).toHaveLength(3);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('не отправляет пагинационные query-параметры', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/attachments',
        createAttachmentListFixture(1)
      );

      await operation.execute('TEST-1');

      const req = httpClient.getRequestHistory()[0];
      expect(req?.path).toBe('/v3/issues/TEST-1/attachments');
      expect(req?.params).toBeUndefined();
    });

    it('пробрасывает ошибку API', async () => {
      await expect(operation.execute('TEST-404')).rejects.toThrow();
    });

    it('кеширует запрос под каноническим ключом list:{issueId}', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/attachments',
        createAttachmentListFixture(1)
      );

      await operation.execute('TEST-1');

      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
      const cacheKey = (mockCacheManager.set as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(cacheKey).toContain('list:TEST-1');
      expect(cacheKey).not.toMatch(/p=|pp=|all=|mi=/);
    });
  });

  describe('executeMany', () => {
    it('возвращает BatchResult с PaginatedResult в value', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/attachments',
        createAttachmentListFixture(2)
      );
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-2/attachments',
        createAttachmentListFixture(1)
      );

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      const results0 = itemAt(results);
      expect(results0.status).toBe('fulfilled');
      if (results0.status === 'fulfilled') {
        expect(results0.value.items).toHaveLength(2);
        expect(results0.value.pagination.fetchedAll).toBe(true);
      }
    });

    it('обрабатывает частичные ошибки', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/attachments',
        createAttachmentListFixture(1)
      );

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(itemAt(results).status).toBe('fulfilled');
      expect(itemAt(results, 1).status).toBe('rejected');
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
