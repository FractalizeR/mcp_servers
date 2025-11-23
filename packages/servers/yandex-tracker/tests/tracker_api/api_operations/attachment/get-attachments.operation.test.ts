/**
 * Unit тесты для GetAttachmentsOperation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetAttachmentsOperation } from '#tracker_api/api_operations/attachment/get-attachments.operation.js';
import {
  createAttachmentFixture,
  createAttachmentListFixture,
} from '#helpers/attachment.fixture.js';

describe('GetAttachmentsOperation', () => {
  let operation: GetAttachmentsOperation;
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

    operation = new GetAttachmentsOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('должна получить список файлов задачи', async () => {
      // Arrange
      const issueId = 'TEST-123';
      const mockAttachments: AttachmentWithUnknownFields[] = createAttachmentListFixture(3);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act
      const result = await operation.execute(issueId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/v2/issues/${issueId}/attachments`);
      expect(result).toEqual(mockAttachments);
      expect(result).toHaveLength(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `GetAttachmentsOperation: получено 3 файлов для ${issueId}`
      );
    });

    it('должна вернуть пустой массив если файлов нет', async () => {
      // Arrange
      const issueId = 'TEST-456';
      const emptyAttachments: AttachmentWithUnknownFields[] = [];

      vi.mocked(mockHttpClient.get).mockResolvedValue(emptyAttachments);

      // Act
      const result = await operation.execute(issueId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('должна получить файлы с различными типами', async () => {
      // Arrange
      const issueId = 'TEST-789';
      const mockAttachments: AttachmentWithUnknownFields[] = [
        createAttachmentFixture({
          id: '1',
          name: 'document.pdf',
          mimetype: 'application/pdf',
          size: 10240,
        }),
        createAttachmentFixture({
          id: '2',
          name: 'screenshot.png',
          mimetype: 'image/png',
          size: 2048,
          thumbnail: 'https://api.tracker.yandex.net/v2/issues/TEST-789/thumbnails/2',
        }),
        createAttachmentFixture({
          id: '3',
          name: 'notes.txt',
          mimetype: 'text/plain',
          size: 512,
        }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act
      const result = await operation.execute(issueId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].mimetype).toBe('application/pdf');
      expect(result[1].mimetype).toBe('image/png');
      expect(result[1].thumbnail).toBeDefined();
      expect(result[2].mimetype).toBe('text/plain');
    });

    it('должна использовать кеш при повторном вызове', async () => {
      // Arrange
      const issueId = 'TEST-321';
      const mockAttachments: AttachmentWithUnknownFields[] = createAttachmentListFixture(2);

      // Первый раз кеша нет
      vi.mocked(mockCacheManager.get).mockResolvedValueOnce(null);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act - первый вызов
      const result1 = await operation.execute(issueId);

      // Второй раз данные из кеша
      vi.mocked(mockCacheManager.get).mockResolvedValueOnce(mockAttachments);

      // Act - второй вызов
      const result2 = await operation.execute(issueId);

      // Assert
      expect(result1).toEqual(mockAttachments);
      expect(result2).toEqual(mockAttachments);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1); // HTTP запрос только один раз
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('должна обработать ошибку API', async () => {
      // Arrange
      const issueId = 'INVALID-123';
      const apiError = new Error('Issue not found');

      vi.mocked(mockHttpClient.get).mockRejectedValue(apiError);

      // Act & Assert
      await expect(operation.execute(issueId)).rejects.toThrow('Issue not found');
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/v2/issues/${issueId}/attachments`);
    });
  });
});
