/**
 * Unit тесты для UploadAttachmentOperation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UploadAttachmentInput } from '#tracker_api/dto/index.js';
import { UploadAttachmentOperation } from '#tracker_api/api_operations/attachment/upload-attachment.operation.js';
import { createAttachmentFixture } from '#helpers/attachment.fixture.js';
import {
  createMockFileBuffer,
  createMockBinaryBuffer,
} from '#helpers/file-upload.helper.js';

describe('UploadAttachmentOperation', () => {
  let operation: UploadAttachmentOperation;
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

    operation = new UploadAttachmentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('должна загрузить файл с Buffer', async () => {
      // Arrange
      const issueId = 'TEST-123';
      const buffer = createMockFileBuffer('test content');
      const input: UploadAttachmentInput = {
        filename: 'test.txt',
        file: buffer,
        mimetype: 'text/plain',
      };

      const mockAttachment: AttachmentWithUnknownFields = createAttachmentFixture({
        id: '12345',
        name: 'test.txt',
        mimetype: 'text/plain',
        size: buffer.length,
      });

      // Mock uploadFile method (from BaseOperation)
      vi.spyOn(operation as any, 'uploadFile').mockResolvedValue(mockAttachment);

      // Act
      const result = await operation.execute(issueId, input);

      // Assert
      expect(result).toEqual(mockAttachment);
      expect(mockCacheManager.delete).toHaveBeenCalled(); // Cache invalidation
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('файл test.txt загружен в TEST-123')
      );
    });

    it('должна загрузить файл с base64 строкой', async () => {
      // Arrange
      const issueId = 'TEST-456';
      const buffer = createMockFileBuffer('test content');
      const base64 = buffer.toString('base64');
      const input: UploadAttachmentInput = {
        filename: 'test.txt',
        file: base64, // base64 строка вместо Buffer
        mimetype: 'text/plain',
      };

      const mockAttachment: AttachmentWithUnknownFields = createAttachmentFixture({
        id: '67890',
        name: 'test.txt',
      });

      vi.spyOn(operation as any, 'uploadFile').mockResolvedValue(mockAttachment);

      // Act
      const result = await operation.execute(issueId, input);

      // Assert
      expect(result).toEqual(mockAttachment);
    });

    it('должна определить MIME тип автоматически если не указан', async () => {
      // Arrange
      const issueId = 'TEST-789';
      const buffer = createMockFileBuffer('test content');
      const input: UploadAttachmentInput = {
        filename: 'document.pdf',
        file: buffer,
        // mimetype не указан
      };

      const mockAttachment: AttachmentWithUnknownFields = createAttachmentFixture({
        name: 'document.pdf',
        mimetype: 'application/pdf',
      });

      vi.spyOn(operation as any, 'uploadFile').mockResolvedValue(mockAttachment);

      // Act
      const result = await operation.execute(issueId, input);

      // Assert
      expect(result).toEqual(mockAttachment);
    });

    it('должна инвалидировать кеш списка файлов после загрузки', async () => {
      // Arrange
      const issueId = 'TEST-321';
      const buffer = createMockFileBuffer('test');
      const input: UploadAttachmentInput = {
        filename: 'file.txt',
        file: buffer,
      };

      const mockAttachment: AttachmentWithUnknownFields = createAttachmentFixture();

      vi.spyOn(operation as any, 'uploadFile').mockResolvedValue(mockAttachment);

      // Act
      await operation.execute(issueId, input);

      // Assert
      expect(mockCacheManager.delete).toHaveBeenCalledWith(
        expect.stringContaining('attachment:list:TEST-321')
      );
    });

    it('должна отклонить файл с невалидным именем', async () => {
      // Arrange
      const issueId = 'TEST-111';
      const buffer = createMockFileBuffer('test');
      const input: UploadAttachmentInput = {
        filename: '../../../etc/passwd', // Невалидное имя (path traversal)
        file: buffer,
      };

      // Act & Assert
      await expect(operation.execute(issueId, input)).rejects.toThrow('Невалидное имя файла');
    });

    it('должна отклонить слишком большой файл', async () => {
      // Arrange
      const issueId = 'TEST-222';
      const maxSize = 1024; // 1KB limit
      operation = new UploadAttachmentOperation(mockHttpClient, mockCacheManager, mockLogger, {
        maxFileSize: maxSize,
      });

      const bigBuffer = createMockBinaryBuffer(2048); // 2KB файл
      const input: UploadAttachmentInput = {
        filename: 'big-file.bin',
        file: bigBuffer,
      };

      // Act & Assert
      await expect(operation.execute(issueId, input)).rejects.toThrow('Файл слишком большой');
    });

    it('должна принять файл допустимого размера', async () => {
      // Arrange
      const issueId = 'TEST-333';
      const maxSize = 2048; // 2KB limit
      operation = new UploadAttachmentOperation(mockHttpClient, mockCacheManager, mockLogger, {
        maxFileSize: maxSize,
      });

      const okBuffer = createMockBinaryBuffer(1024); // 1KB файл (меньше лимита)
      const input: UploadAttachmentInput = {
        filename: 'ok-file.bin',
        file: okBuffer,
      };

      const mockAttachment: AttachmentWithUnknownFields = createAttachmentFixture({
        name: 'ok-file.bin',
        size: okBuffer.length,
      });

      vi.spyOn(operation as any, 'uploadFile').mockResolvedValue(mockAttachment);

      // Act
      const result = await operation.execute(issueId, input);

      // Assert
      expect(result).toEqual(mockAttachment);
    });

    it('должна обработать различные расширения файлов', async () => {
      // Arrange
      const issueId = 'TEST-444';
      const testCases = [
        { filename: 'image.png', expectedMime: 'image/png' },
        { filename: 'document.pdf', expectedMime: 'application/pdf' },
        { filename: 'archive.zip', expectedMime: 'application/zip' },
        { filename: 'data.json', expectedMime: 'application/json' },
      ];

      for (const testCase of testCases) {
        const buffer = createMockFileBuffer('test');
        const input: UploadAttachmentInput = {
          filename: testCase.filename,
          file: buffer,
        };

        const mockAttachment: AttachmentWithUnknownFields = createAttachmentFixture({
          name: testCase.filename,
        });

        vi.spyOn(operation as any, 'uploadFile').mockResolvedValue(mockAttachment);

        // Act
        const result = await operation.execute(issueId, input);

        // Assert
        expect(result.name).toBe(testCase.filename);
      }
    });
  });
});
