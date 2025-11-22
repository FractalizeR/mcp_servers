import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { AddCommentInput } from '#tracker_api/dto/index.js';
import { AddCommentOperation } from '#tracker_api/api_operations/comment/add-comment.operation.js';

describe('AddCommentOperation', () => {
  let operation: AddCommentOperation;
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
    } as unknown as HttpClient;

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

    operation = new AddCommentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data', async () => {
      const input: AddCommentInput = {
        text: 'Test comment',
      };

      const mockComment: CommentWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComment);

      const result = await operation.execute('TEST-1', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/TEST-1/comments', input);
      expect(result).toEqual(mockComment);
    });

    it('should add comment with attachments', async () => {
      const input: AddCommentInput = {
        text: 'Comment with attachments',
        attachmentIds: ['att-1', 'att-2'],
      };

      const mockComment: CommentWithUnknownFields = {
        id: '456',
        self: 'https://api.tracker.yandex.net/v3/issues/PROJ-10/comments/456',
        text: 'Comment with attachments',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/2',
          id: '2',
          display: 'User Two',
        },
        createdAt: '2025-01-18T11:00:00.000+0000',
        attachments: [
          { id: 'att-1', name: 'file1.txt', size: 1024 },
          { id: 'att-2', name: 'file2.pdf', size: 2048 },
        ],
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComment);

      const result = await operation.execute('PROJ-10', input);

      expect(result.attachments).toHaveLength(2);
      expect(result.attachments?.[0].id).toBe('att-1');
    });

    it('should handle API errors', async () => {
      const input: AddCommentInput = {
        text: 'Test comment',
      };

      const error = new Error('API Error');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', input)).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const input: AddCommentInput = {
        text: 'Test comment',
      };

      const mockComment: CommentWithUnknownFields = {
        id: '789',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-2/comments/789',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T12:00:00.000+0000',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComment);

      await operation.execute('TEST-2', input);

      expect(mockLogger.info).toHaveBeenCalledWith('Добавление комментария к задаче TEST-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Комментарий успешно добавлен к задаче TEST-2: 789'
      );
    });
  });
});
