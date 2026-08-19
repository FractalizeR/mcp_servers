import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BulkMoveIssuesInputDto } from '#tracker_api/dto/index.js';
import { BulkMoveIssuesOperation } from '#tracker_api/api_operations/bulk-change/bulk-move-issues.operation.js';

describe('BulkMoveIssuesOperation', () => {
  let operation: BulkMoveIssuesOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  const mockBulkChangeResult: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v2/bulkchange/op-1',
    status: 'CREATED',
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IHttpClient;

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

    operation = new BulkMoveIssuesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with issues and queue (minimal params)', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      const params: BulkMoveIssuesInputDto = {
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
      };

      const result = await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/bulkchange/_move', {
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
      });
      expect(result).toEqual(mockBulkChangeResult);
    });

    it('should include moveAllFields in the request body when true', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        moveAllFields: true,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/bulkchange/_move', {
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        moveAllFields: true,
      });
    });

    // Регрессионный тест для дефекта: initialStatus объявлен в DTO/schema, но не доезжал
    // до API (bulk-move-issues.operation.ts не прокидывал его в requestBody).
    it('should include initialStatus=true in the request body when explicitly set', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: true,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/bulkchange/_move', {
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: true,
      });
    });

    it('should include initialStatus=false in the request body when explicitly set', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: false,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/bulkchange/_move', {
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: false,
      });
    });

    it('should NOT include initialStatus in the request body when not provided', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
      });

      const [, body] = vi.mocked(mockHttpClient.post).mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(body).not.toHaveProperty('initialStatus');
    });

    it('should include values in the request body when provided', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        values: { priority: 'critical' },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/bulkchange/_move', {
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        values: { priority: 'critical' },
      });
    });
  });
});
