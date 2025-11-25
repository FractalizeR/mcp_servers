import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { EditCommentInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { EditCommentOperation } from '#tracker_api/api_operations/comment/edit-comment.operation.js';

describe('EditCommentOperation', () => {
  let operation: EditCommentOperation;
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

    operation = new EditCommentOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct endpoint and data', async () => {
      const input: EditCommentInput = {
        text: 'Updated comment text',
      };

      const mockComment: CommentWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Updated comment text',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        updatedAt: '2025-01-18T12:00:00.000+0000',
        version: 2,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComment);

      const result = await operation.execute('TEST-1', '123', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/issues/TEST-1/comments/123', input);
      expect(result).toEqual(mockComment);
    });

    it('should return updated comment with version', async () => {
      const input: EditCommentInput = {
        text: 'New text',
      };

      const mockComment: CommentWithUnknownFields = {
        id: '456',
        self: 'https://api.tracker.yandex.net/v3/issues/PROJ-10/comments/456',
        text: 'New text',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/2',
          id: '2',
          display: 'User Two',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v3/users/3',
          id: '3',
          display: 'Editor',
        },
        updatedAt: '2025-01-18T13:00:00.000+0000',
        version: 5,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComment);

      const result = await operation.execute('PROJ-10', '456', input);

      expect(result.version).toBe(5);
      expect(result.updatedBy?.id).toBe('3');
    });

    it('should handle API errors', async () => {
      const input: EditCommentInput = {
        text: 'Updated text',
      };

      const error = new Error('API Error');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', '123', input)).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const input: EditCommentInput = {
        text: 'Updated comment',
      };

      const mockComment: CommentWithUnknownFields = {
        id: '789',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-2/comments/789',
        text: 'Updated comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T14:00:00.000+0000',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComment);

      await operation.execute('TEST-2', '789', input);

      expect(mockLogger.info).toHaveBeenCalledWith('Редактирование комментария 789 задачи TEST-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Комментарий 789 задачи TEST-2 успешно обновлён'
      );
    });
  });

  describe('executeMany', () => {
    it('should edit comments from multiple issues', async () => {
      const comments = [
        { issueId: 'TEST-1', commentId: '123', text: 'Updated text 1' },
        { issueId: 'TEST-2', commentId: '456', text: 'Updated text 2' },
      ];

      const mockComment1: CommentWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Updated text 1',
        createdBy: { self: '', id: '1', display: 'User' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T12:00:00.000+0000',
        version: 2,
      };

      const mockComment2: CommentWithUnknownFields = {
        id: '456',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-2/comments/456',
        text: 'Updated text 2',
        createdBy: { self: '', id: '1', display: 'User' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T12:00:00.000+0000',
        version: 3,
      };

      vi.mocked(mockHttpClient.patch)
        .mockResolvedValueOnce(mockComment1)
        .mockResolvedValueOnce(mockComment2);

      const result = await operation.executeMany(comments);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1:123');
      expect(result[1].status).toBe('fulfilled');
      expect(result[1].key).toBe('TEST-2:456');
    });

    it('should handle partial failures when editing comments', async () => {
      const comments = [
        { issueId: 'TEST-1', commentId: '123', text: 'Updated text 1' },
        { issueId: 'TEST-2', commentId: '456', text: 'Updated text 2' },
      ];

      const mockComment: CommentWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Updated text 1',
        createdBy: { self: '', id: '1', display: 'User' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T12:00:00.000+0000',
        version: 2,
      };

      vi.mocked(mockHttpClient.patch)
        .mockResolvedValueOnce(mockComment)
        .mockRejectedValueOnce(new Error('Comment not found'));

      const result = await operation.executeMany(comments);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1:123');
      expect(result[1].status).toBe('rejected');
      expect(result[1].key).toBe('TEST-2:456');
      if (result[1].status === 'rejected') {
        expect(result[1].reason.message).toBe('Comment not found');
      }
    });

    it('should return empty result for empty comments array', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.patch).not.toHaveBeenCalled();
    });

    it('should log batch operation', async () => {
      const comments = [
        { issueId: 'TEST-1', commentId: '123', text: 'Updated text 1' },
        { issueId: 'TEST-2', commentId: '456', text: 'Updated text 2' },
      ];

      const mockComment: CommentWithUnknownFields = {
        id: '123',
        self: '',
        text: 'Updated',
        createdBy: { self: '', id: '1', display: 'User' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T12:00:00.000+0000',
        version: 2,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComment);

      await operation.executeMany(comments);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Редактирование 2 комментариев параллельно: TEST-1/123, TEST-2/456'
      );
    });

    it('should call correct endpoints for each comment', async () => {
      const comments = [
        { issueId: 'TEST-1', commentId: '123', text: 'Updated text 1' },
        { issueId: 'TEST-2', commentId: '456', text: 'Updated text 2' },
      ];

      const mockComment: CommentWithUnknownFields = {
        id: '123',
        self: '',
        text: 'Updated',
        createdBy: { self: '', id: '1', display: 'User' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T12:00:00.000+0000',
        version: 2,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComment);

      await operation.executeMany(comments);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/issues/TEST-1/comments/123', {
        text: 'Updated text 1',
      });
      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/issues/TEST-2/comments/456', {
        text: 'Updated text 2',
      });
    });
  });
});
