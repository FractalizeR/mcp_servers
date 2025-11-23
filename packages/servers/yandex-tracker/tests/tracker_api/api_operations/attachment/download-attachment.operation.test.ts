/**
 * Unit тесты для DownloadAttachmentOperation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import { DownloadAttachmentOperation } from '#tracker_api/api_operations/attachment/download-attachment.operation.js';
import {
  createAttachmentFixture,
  createAttachmentListFixture,
} from '#helpers/attachment.fixture.js';
import { createMockFileBuffer, compareBuffers } from '#helpers/file-upload.helper.js';

describe('DownloadAttachmentOperation', () => {
  let operation: DownloadAttachmentOperation;
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

    operation = new DownloadAttachmentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('должна скачать файл и вернуть Buffer', async () => {
      // Arrange
      const issueId = 'TEST-123';
      const attachmentId = '67890';
      const filename = 'report.pdf';
      const mockBuffer = createMockFileBuffer('test file content');

      // Mock downloadFile method (from BaseOperation)
      vi.spyOn(operation as any, 'downloadFile').mockResolvedValue(mockBuffer);

      // Act
      const result = await operation.execute(issueId, attachmentId, filename);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(mockBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`файл ${filename} скачан из ${issueId}`)
      );
    });

    it('должна правильно кодировать имя файла в URL', async () => {
      // Arrange
      const issueId = 'TEST-456';
      const attachmentId = '12345';
      const filename = 'файл с пробелами.pdf'; // Non-ASCII and spaces
      const mockBuffer = createMockFileBuffer('test');

      const downloadFileSpy = vi
        .spyOn(operation as any, 'downloadFile')
        .mockResolvedValue(mockBuffer);

      // Act
      await operation.execute(issueId, attachmentId, filename);

      // Assert
      expect(downloadFileSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(filename))
      );
    });

    it('должна скачать файлы различных типов', async () => {
      // Arrange
      const issueId = 'TEST-789';
      const testCases = [
        { attachmentId: '1', filename: 'document.pdf', content: 'PDF content' },
        { attachmentId: '2', filename: 'image.png', content: 'PNG binary data' },
        { attachmentId: '3', filename: 'data.json', content: '{"key": "value"}' },
      ];

      for (const testCase of testCases) {
        const mockBuffer = createMockFileBuffer(testCase.content);
        vi.spyOn(operation as any, 'downloadFile').mockResolvedValue(mockBuffer);

        // Act
        const result = await operation.execute(issueId, testCase.attachmentId, testCase.filename);

        // Assert
        expect(result).toBeInstanceOf(Buffer);
        expect(result.toString('utf-8')).toBe(testCase.content);
      }
    });

    it('должна обработать пустой файл', async () => {
      // Arrange
      const issueId = 'TEST-321';
      const attachmentId = '99999';
      const filename = 'empty.txt';
      const emptyBuffer = Buffer.alloc(0);

      vi.spyOn(operation as any, 'downloadFile').mockResolvedValue(emptyBuffer);

      // Act
      const result = await operation.execute(issueId, attachmentId, filename);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(0);
    });

    it('должна обработать большой файл', async () => {
      // Arrange
      const issueId = 'TEST-111';
      const attachmentId = '55555';
      const filename = 'large-file.bin';
      const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB

      vi.spyOn(operation as any, 'downloadFile').mockResolvedValue(largeBuffer);

      // Act
      const result = await operation.execute(issueId, attachmentId, filename);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(1024 * 1024);
    });

    it('должна обработать ошибку скачивания', async () => {
      // Arrange
      const issueId = 'TEST-222';
      const attachmentId = 'invalid';
      const filename = 'not-found.pdf';
      const error = new Error('File not found');

      vi.spyOn(operation as any, 'downloadFile').mockRejectedValue(error);

      // Act & Assert
      await expect(operation.execute(issueId, attachmentId, filename)).rejects.toThrow(
        'File not found'
      );
    });

    it('должна сохранить целостность бинарных данных', async () => {
      // Arrange
      const issueId = 'TEST-333';
      const attachmentId = '77777';
      const filename = 'binary.dat';
      const originalBuffer = createMockFileBuffer('original binary content');

      vi.spyOn(operation as any, 'downloadFile').mockResolvedValue(originalBuffer);

      // Act
      const downloadedBuffer = await operation.execute(issueId, attachmentId, filename);

      // Assert
      expect(compareBuffers(originalBuffer, downloadedBuffer)).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('должна получить метаданные файла по attachmentId', async () => {
      // Arrange
      const issueId = 'TEST-123';
      const attachmentId = '67890';
      const mockAttachments: AttachmentWithUnknownFields[] = createAttachmentListFixture(3);
      mockAttachments[1].id = attachmentId; // Нужный файл в середине списка

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act
      const result = await operation.getMetadata(issueId, attachmentId);

      // Assert
      expect(result.id).toBe(attachmentId);
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/v2/issues/${issueId}/attachments`);
    });

    it('должна выбросить ошибку если файл не найден', async () => {
      // Arrange
      const issueId = 'TEST-456';
      const attachmentId = 'not-found';
      const mockAttachments: AttachmentWithUnknownFields[] = createAttachmentListFixture(3);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act & Assert
      await expect(operation.getMetadata(issueId, attachmentId)).rejects.toThrow(
        `Файл с id=${attachmentId} не найден в задаче ${issueId}`
      );
    });

    it('должна показать доступные файлы в ошибке', async () => {
      // Arrange
      const issueId = 'TEST-789';
      const attachmentId = 'missing';
      const mockAttachments: AttachmentWithUnknownFields[] = [
        createAttachmentFixture({ id: '1' }),
        createAttachmentFixture({ id: '2' }),
        createAttachmentFixture({ id: '3' }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act & Assert
      await expect(operation.getMetadata(issueId, attachmentId)).rejects.toThrow(
        'Доступные файлы: 1, 2, 3'
      );
    });

    it('должна найти файл в пустом списке и выбросить ошибку', async () => {
      // Arrange
      const issueId = 'TEST-321';
      const attachmentId = 'any';
      const emptyAttachments: AttachmentWithUnknownFields[] = [];

      vi.mocked(mockHttpClient.get).mockResolvedValue(emptyAttachments);

      // Act & Assert
      await expect(operation.getMetadata(issueId, attachmentId)).rejects.toThrow(
        `Файл с id=${attachmentId} не найден`
      );
    });

    it('должна вернуть полные метаданные файла', async () => {
      // Arrange
      const issueId = 'TEST-111';
      const attachmentId = '12345';
      const mockAttachment = createAttachmentFixture({
        id: attachmentId,
        name: 'report.pdf',
        mimetype: 'application/pdf',
        size: 10240,
      });
      const mockAttachments: AttachmentWithUnknownFields[] = [mockAttachment];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAttachments);

      // Act
      const result = await operation.getMetadata(issueId, attachmentId);

      // Assert
      expect(result).toMatchObject({
        id: attachmentId,
        name: 'report.pdf',
        mimetype: 'application/pdf',
        size: 10240,
      });
      expect(result).toHaveProperty('createdBy');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('content');
    });
  });
});
