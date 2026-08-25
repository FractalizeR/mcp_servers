import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BulkUpdateIssuesInputDto } from '#tracker_api/dto/index.js';
import { BulkUpdateIssuesOperation } from '#tracker_api/api_operations/bulk-change/bulk-update-issues.operation.js';

describe('BulkUpdateIssuesOperation', () => {
  let operation: BulkUpdateIssuesOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  const mockBulkChangeResult: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v3/bulkchange/op-1',
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

    operation = new BulkUpdateIssuesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with issues and values', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      const params: BulkUpdateIssuesInputDto = {
        issues: ['QUEUE1-1', 'QUEUE1-2', 'QUEUE1-3'],
        values: { priority: 'minor', tags: { add: ['bug'] } },
      };

      const result = await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/bulkchange/_update', {
        issues: ['QUEUE1-1', 'QUEUE1-2', 'QUEUE1-3'],
        values: { priority: 'minor', tags: { add: ['bug'] } },
      });
      expect(result).toEqual(mockBulkChangeResult);
    });
  });
});
