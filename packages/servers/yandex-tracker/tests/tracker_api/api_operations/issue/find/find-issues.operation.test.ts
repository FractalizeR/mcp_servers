import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { FindIssuesInputDto } from '#tracker_api/dto/index.js';
import { FindIssuesOperation } from '#tracker_api/api_operations/issue/find/find-issues.operation.js';

describe('FindIssuesOperation', () => {
  let operation: FindIssuesOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  const mockIssue: IssueWithUnknownFields = {
    id: '1',
    key: 'TEST-123',
    summary: 'Test Issue',
    queue: { id: '1', key: 'TEST', name: 'Test Queue' },
    status: { id: '1', key: 'open', display: 'Open' },
    createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
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

    operation = new FindIssuesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct search params', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        query: 'status: open',
      });
    });

    it('should support query (JQL) search', async () => {
      const params: FindIssuesInputDto = {
        query: 'queue: TEST AND status: open',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      const result = await operation.execute(params);

      expect(result).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        query: 'queue: TEST AND status: open',
      });
    });

    it('should support filter search', async () => {
      const params: FindIssuesInputDto = {
        filter: { queue: 'TEST', status: 'open' },
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      const result = await operation.execute(params);

      expect(result).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        filter: { queue: 'TEST', status: 'open' },
      });
    });

    it('should support queue search', async () => {
      const params: FindIssuesInputDto = {
        queue: 'TEST',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      const result = await operation.execute(params);

      expect(result).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', { queue: 'TEST' });
    });

    it('should support keys search', async () => {
      const params: FindIssuesInputDto = {
        keys: ['TEST-1', 'TEST-2'],
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      const result = await operation.execute(params);

      expect(result).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        keys: ['TEST-1', 'TEST-2'],
      });
    });

    it('should handle pagination (page, perPage)', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
        perPage: 50,
        page: 2,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search?perPage=50&page=2', {
        query: 'status: open',
      });
    });

    it('should handle sorting (order)', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
        order: ['-createdAt'],
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        query: 'status: open',
        order: ['-createdAt'],
      });
    });

    it('should return issues array', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
      };

      const mockIssues = [mockIssue, { ...mockIssue, key: 'TEST-124' }];
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockIssues);

      const result = await operation.execute(params);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockIssues);
    });

    it('should handle empty results', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: closed',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([]);

      const result = await operation.execute(params);

      expect(result).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Найдено задач: 0');
    });

    it('should handle HTTP errors', async () => {
      const params: FindIssuesInputDto = {
        query: 'invalid query',
      };

      const mockError = new Error('HTTP 400: Invalid query');
      vi.mocked(mockHttpClient.post).mockRejectedValue(mockError);

      await expect(operation.execute(params)).rejects.toThrow('HTTP 400: Invalid query');
    });

    it('should throw error if no search method specified', async () => {
      const params: FindIssuesInputDto = {};

      await expect(operation.execute(params)).rejects.toThrow(
        'FindIssuesOperation: не указан способ поиска'
      );
    });

    it('should support filterId search', async () => {
      const params: FindIssuesInputDto = {
        filterId: 'filter-123',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      const result = await operation.execute(params);

      expect(result).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        filterId: 'filter-123',
      });
    });

    it('should handle expand parameter', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
        expand: ['transitions', 'attachments'],
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v3/issues/_search?expand=transitions%2Cattachments',
        {
          query: 'status: open',
        }
      );
    });

    it('should handle expand parameter with single value', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
        expand: ['transitions'],
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search?expand=transitions', {
        query: 'status: open',
      });
    });

    it('should ignore empty expand array', async () => {
      const params: FindIssuesInputDto = {
        query: 'status: open',
        expand: [],
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue([mockIssue]);

      await operation.execute(params);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/_search', {
        query: 'status: open',
      });
    });
  });
});
