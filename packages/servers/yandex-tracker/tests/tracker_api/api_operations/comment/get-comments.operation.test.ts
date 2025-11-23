import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { GetCommentsInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { GetCommentsOperation } from '#tracker_api/api_operations/comment/get-comments.operation.js';

describe('GetCommentsOperation', () => {
  let operation: GetCommentsOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

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

    mockConfig = {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    } as ServerConfig;

    operation = new GetCommentsOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockComments: CommentWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/1',
          text: 'First comment',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v3/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComments);

      const result = await operation.execute('TEST-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TEST-1/comments');
      expect(result).toEqual(mockComments);
    });

    it('should pass pagination parameters', async () => {
      const input: GetCommentsInput = {
        perPage: 50,
        page: 2,
      };

      const mockComments: CommentWithUnknownFields[] = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComments);

      await operation.execute('PROJ-10', input);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v3/issues/PROJ-10/comments?perPage=50&page=2'
      );
    });

    it('should pass expand parameter', async () => {
      const input: GetCommentsInput = {
        expand: 'attachments',
      };

      const mockComments: CommentWithUnknownFields[] = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComments);

      await operation.execute('TEST-2', input);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v3/issues/TEST-2/comments?expand=attachments'
      );
    });

    it('should convert non-array response to array', async () => {
      const mockComment: CommentWithUnknownFields = {
        id: '1',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/1',
        text: 'Single comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'User 1',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComment as never);

      const result = await operation.execute('TEST-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockComment);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute('TEST-1')).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const mockComments: CommentWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/1',
          text: 'Comment 1',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v3/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
        },
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/2',
          text: 'Comment 2',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v3/users/2',
            id: '2',
            display: 'User 2',
          },
          createdAt: '2025-01-18T11:00:00.000+0000',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComments);

      await operation.execute('TEST-1');

      expect(mockLogger.info).toHaveBeenCalledWith('Получение комментариев задачи TEST-1');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 2 комментариев для задачи TEST-1');
    });
  });

  describe('executeMany', () => {
    it('should get comments for multiple issues in parallel', async () => {
      const mockComments1: CommentWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/1',
          text: 'Comment 1 for TEST-1',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v3/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
        },
      ];

      const mockComments2: CommentWithUnknownFields[] = [
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-2/comments/2',
          text: 'Comment 1 for TEST-2',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v3/users/2',
            id: '2',
            display: 'User 2',
          },
          createdAt: '2025-01-18T11:00:00.000+0000',
        },
      ];

      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce(mockComments1)
        .mockResolvedValueOnce(mockComments2);

      const result = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1');
      if (result[0].status === 'fulfilled') {
        expect(result[0].value).toEqual(mockComments1);
      }
      expect(result[1].status).toBe('fulfilled');
      expect(result[1].key).toBe('TEST-2');
      if (result[1].status === 'fulfilled') {
        expect(result[1].value).toEqual(mockComments2);
      }
    });

    it('should handle partial failures (some succeed, some fail)', async () => {
      const mockComments: CommentWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/1',
          text: 'Comment 1',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v3/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
        },
      ];

      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce(mockComments)
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1');
      if (result[0].status === 'fulfilled') {
        expect(result[0].value).toEqual(mockComments);
      }
      expect(result[1].status).toBe('rejected');
      expect(result[1].key).toBe('TEST-2');
      if (result[1].status === 'rejected') {
        expect(result[1].reason.message).toBe('Not found');
      }
    });

    it('should apply perPage and page to all issues', async () => {
      const mockComments: CommentWithUnknownFields[] = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComments);

      const input: GetCommentsInput = {
        perPage: 10,
        page: 2,
      };

      await operation.executeMany(['TEST-1', 'TEST-2'], input);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v3/issues/TEST-1/comments?perPage=10&page=2'
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v3/issues/TEST-2/comments?perPage=10&page=2'
      );
    });

    it('should return empty result for empty array', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should log batch operation', async () => {
      const mockComments: CommentWithUnknownFields[] = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComments);

      await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение комментариев для 2 задач параллельно: TEST-1, TEST-2'
      );
    });
  });
});
