import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { EditCommentInput } from '#tracker_api/dto/index.js';
import { EditCommentOperation } from '#tracker_api/api_operations/comment/edit-comment.operation.js';

describe('EditCommentOperation', () => {
  let operation: EditCommentOperation;
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

    operation = new EditCommentOperation(mockHttpClient, mockCacheManager, mockLogger);
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
});
