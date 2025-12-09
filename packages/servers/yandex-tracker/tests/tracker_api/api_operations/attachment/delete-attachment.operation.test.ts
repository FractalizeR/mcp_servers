/**
 * Unit тесты для DeleteAttachmentOperation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { DeleteAttachmentOperation } from '#tracker_api/api_operations/attachment/delete-attachment.operation.js';

describe('DeleteAttachmentOperation', () => {
  let operation: DeleteAttachmentOperation;
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

    operation = new DeleteAttachmentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('должна удалить файл по attachmentId', async () => {
      // Arrange
      const issueId = 'TEST-123';
      const attachmentId = '67890';

      // Mock deleteRequest method (from BaseOperation)
      const deleteRequestSpy = vi
        .spyOn(operation as any, 'deleteRequest')
        .mockResolvedValue(undefined);

      // Act
      await operation.execute(issueId, attachmentId);

      // Assert
      expect(deleteRequestSpy).toHaveBeenCalledWith(
        `/v2/issues/${issueId}/attachments/${attachmentId}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`файл attachmentId=${attachmentId} удален из ${issueId}`)
      );
    });

    it('должна инвалидировать кеш списка файлов после удаления', async () => {
      // Arrange
      const issueId = 'TEST-456';
      const attachmentId = '12345';

      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      // Act
      await operation.execute(issueId, attachmentId);

      // Assert
      expect(mockCacheManager.delete).toHaveBeenCalledWith(
        expect.stringContaining('attachment:list:TEST-456')
      );
    });

    it('должна успешно удалить файл и не вернуть ничего', async () => {
      // Arrange
      const issueId = 'TEST-789';
      const attachmentId = '99999';

      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      // Act
      const result = await operation.execute(issueId, attachmentId);

      // Assert
      expect(result).toBeUndefined();
    });

    it('должна обработать ошибку удаления (файл не найден)', async () => {
      // Arrange
      const issueId = 'TEST-111';
      const attachmentId = 'not-found';
      const error = new Error('Attachment not found');

      vi.spyOn(operation as any, 'deleteRequest').mockRejectedValue(error);

      // Act & Assert
      await expect(operation.execute(issueId, attachmentId)).rejects.toThrow(
        'Attachment not found'
      );
    });

    it('должна обработать ошибку прав доступа', async () => {
      // Arrange
      const issueId = 'TEST-222';
      const attachmentId = 'forbidden';
      const error = new Error('Access denied');

      vi.spyOn(operation as any, 'deleteRequest').mockRejectedValue(error);

      // Act & Assert
      await expect(operation.execute(issueId, attachmentId)).rejects.toThrow('Access denied');
    });

    it('должна логировать начало и завершение удаления', async () => {
      // Arrange
      const issueId = 'TEST-333';
      const attachmentId = '77777';

      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      // Act
      await operation.execute(issueId, attachmentId);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`удаление файла attachmentId=${attachmentId}`)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`файл attachmentId=${attachmentId} удален`)
      );
    });

    it('должна удалять файлы из разных задач независимо', async () => {
      // Arrange
      const testCases = [
        { issueId: 'PROJ1-1', attachmentId: '1' },
        { issueId: 'PROJ2-5', attachmentId: '2' },
        { issueId: 'QUEUE-100', attachmentId: '3' },
      ];

      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      for (const testCase of testCases) {
        // Act
        await operation.execute(testCase.issueId, testCase.attachmentId);

        // Assert
        expect(mockCacheManager.delete).toHaveBeenCalledWith(
          expect.stringContaining(`list:${testCase.issueId}`)
        );
      }

      // Assert общее количество вызовов
      expect(mockCacheManager.delete).toHaveBeenCalledTimes(3);
    });

    it('должна корректно работать при множественных удалениях', async () => {
      // Arrange
      const issueId = 'TEST-444';
      const attachmentIds = ['1', '2', '3'];

      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      // Act
      for (const attachmentId of attachmentIds) {
        await operation.execute(issueId, attachmentId);
      }

      // Assert
      expect(mockCacheManager.delete).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });
  });
});
