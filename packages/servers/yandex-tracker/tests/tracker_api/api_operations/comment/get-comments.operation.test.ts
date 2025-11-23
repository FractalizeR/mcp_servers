import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { GetCommentsInput } from '#tracker_api/dto/index.js';
import { GetCommentsOperation } from '#tracker_api/api_operations/comment/get-comments.operation.js';

describe('GetCommentsOperation', () => {
  let operation: GetCommentsOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

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

    operation = new GetCommentsOperation(mockHttpClient, mockCacheManager, mockLogger);
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
});
