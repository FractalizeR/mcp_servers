import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetBulkChangeStatusOperation } from '#tracker_api/api_operations/bulk-change/get-bulk-change-status.operation.js';

describe('GetBulkChangeStatusOperation', () => {
  let operation: GetBulkChangeStatusOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  const mockBulkChangeStatus: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v3/bulkchange/op-1',
    status: 'COMPLETE',
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
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

    operation = new GetBulkChangeStatusOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with the operation id in the path', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockBulkChangeStatus);

      const result = await operation.execute('op-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/bulkchange/op-1');
      expect(result).toEqual(mockBulkChangeStatus);
    });
  });
});
