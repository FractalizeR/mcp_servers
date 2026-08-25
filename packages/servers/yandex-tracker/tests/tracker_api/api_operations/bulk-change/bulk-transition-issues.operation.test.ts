import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BulkTransitionIssuesInputDto } from '#tracker_api/dto/index.js';
import { BulkTransitionIssuesOperation } from '#tracker_api/api_operations/bulk-change/bulk-transition-issues.operation.js';

describe('BulkTransitionIssuesOperation', () => {
  let operation: BulkTransitionIssuesOperation;
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

    operation = new BulkTransitionIssuesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with issues and transition (minimal params)', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      const params: BulkTransitionIssuesInputDto = {
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        transition: 'start_progress',
      };

      const result = await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/bulkchange/_transition', {
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        transition: 'start_progress',
      });
      expect(result).toEqual(mockBulkChangeResult);
    });

    it('should include values in the request body when provided', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        transition: 'close',
        values: { resolution: 'fixed' },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/bulkchange/_transition', {
        issues: ['QUEUE1-1'],
        transition: 'close',
        values: { resolution: 'fixed' },
      });
    });

    it('should NOT include values in the request body when not provided', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockBulkChangeResult);

      await operation.execute({
        issues: ['QUEUE1-1'],
        transition: 'start_progress',
      });

      const [, body] = vi.mocked(mockHttpClient.post).mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(body).not.toHaveProperty('values');
    });
  });
});
