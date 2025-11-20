/**
 * Интеграционные тесты для download-attachment tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → DownloadAttachmentTool → DownloadAttachmentOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';

// Мокаем модуль fs/promises для возможности имитации ошибок
const { writeFileMock } = vi.hoisted(() => ({
  writeFileMock: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual: any = await importOriginal();
  return {
    ...actual,
    writeFile: writeFileMock,
  };
});

describe('download-attachment integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    // ВАЖНО: создаём MCP клиент СНАЧАЛА, чтобы получить axios instance
    client = await createTestClient({
      logLevel: 'silent', // Отключаем логи в тестах
    });

    // Затем создаём MockServer с axios instance из клиента
    mockServer = createMockServer(client.getAxiosInstance());

    // Сбрасываем мок writeFile и используем реальную реализацию по умолчанию
    writeFileMock.mockReset();
    writeFileMock.mockImplementation(async (...args) => {
      const fs = await import('node:fs/promises');
      return fs.writeFile(...args);
    });
  });

  afterEach(() => {
    // Очищаем моки после каждого теста
    mockServer.cleanup();
  });

  describe('Happy Path', () => {
    it('должен успешно скачать файл и вернуть base64', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = '12345';
      const filename = 'test-file.txt';

      // Мокируем запрос на список файлов для получения метаданных
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: filename,
          mimetype: 'text/plain',
          size: 100,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/${filename}`,
        },
      ]);
      mockServer.mockDownloadAttachmentSuccess(issueId, attachmentId, filename);

      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId,
        attachmentId,
        filename,
      });

      // Assert
      if (result.isError) {
        console.log('Error result:', result.content[0]?.text);
      }
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        issueId,
        attachmentId,
        filename,
      });

      expect(response).toHaveProperty('base64');
      expect(response).toHaveProperty('size');
      expect(response).toHaveProperty('mimetype');
      expect(typeof response.base64).toBe('string');
      expect(response.base64.length).toBeGreaterThan(0);

      mockServer.assertAllRequestsDone();
    });

    it('должен скачать и вернуть метаданные файла', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      const attachmentId = '67890';
      const filename = 'document.pdf';

      // Мокируем запрос на список файлов для получения метаданных
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: filename,
          mimetype: 'application/pdf',
          size: 2048,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/${filename}`,
        },
      ]);
      mockServer.mockDownloadAttachmentSuccess(issueId, attachmentId, filename);

      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId,
        attachmentId,
        filename,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.size).toBeGreaterThan(0);
      expect(response).toHaveProperty('mimetype');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (файл не найден)', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = 'nonexistent';
      const filename = 'missing.txt';

      // Мокируем запрос на список файлов, но файл не найден
      mockServer.mockGetAttachments404(issueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId,
        attachmentId,
        filename,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом issueId', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId: '',
        attachmentId: '12345',
        filename: 'test.txt',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при пустом attachmentId', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId: 'QUEUE-1',
        attachmentId: '',
        filename: 'test.txt',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при пустом filename', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId: 'QUEUE-1',
        attachmentId: '12345',
        filename: '',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии обязательных параметров', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {});

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });
  });

  describe('Error Handling при сохранении файла', () => {
    it('должен обработать ошибку EACCES при записи файла', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = '12345';
      const filename = 'test-file.txt';
      const saveToPath = '/root/protected/file.txt';

      // Мокируем успешное скачивание
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: filename,
          mimetype: 'text/plain',
          size: 100,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/${filename}`,
        },
      ]);
      mockServer.mockDownloadAttachmentSuccess(issueId, attachmentId, filename);

      // Мокируем ошибку при записи файла
      const writeError = new Error('EACCES: permission denied');
      // @ts-expect-error - мокируем системную ошибку
      writeError.code = 'EACCES';
      writeFileMock.mockRejectedValueOnce(writeError);

      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId,
        attachmentId,
        filename,
        saveToPath,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Не удалось сохранить файл');
      expect(result.content[0]!.text).toContain(saveToPath);

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку ENOSPC при записи файла', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      const attachmentId = '67890';
      const filename = 'large-file.pdf';
      const saveToPath = '/tmp/large-file.pdf';

      // Мокируем успешное скачивание
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: filename,
          mimetype: 'application/pdf',
          size: 2048,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/${filename}`,
        },
      ]);
      mockServer.mockDownloadAttachmentSuccess(issueId, attachmentId, filename);

      // Мокируем ошибку при записи файла (нет места на диске)
      const writeError = new Error('ENOSPC: no space left on device');
      // @ts-expect-error - мокируем системную ошибку
      writeError.code = 'ENOSPC';
      writeFileMock.mockRejectedValueOnce(writeError);

      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId,
        attachmentId,
        filename,
        saveToPath,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Не удалось сохранить файл');
      expect(result.content[0]!.text).toContain(saveToPath);

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать общую ошибку при записи файла', async () => {
      // Arrange
      const issueId = 'QUEUE-3';
      const attachmentId = 'abc123';
      const filename = 'document.txt';
      const saveToPath = '/invalid\x00path/file.txt';

      // Мокируем успешное скачивание
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: filename,
          mimetype: 'text/plain',
          size: 150,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/${filename}`,
        },
      ]);
      mockServer.mockDownloadAttachmentSuccess(issueId, attachmentId, filename);

      // Мокируем общую ошибку при записи файла
      writeFileMock.mockRejectedValueOnce(new Error('Invalid path'));

      // Act
      const result = await client.callTool('fr_yandex_tracker_download_attachment', {
        issueId,
        attachmentId,
        filename,
        saveToPath,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Не удалось сохранить файл');

      mockServer.assertAllRequestsDone();
    });
  });
});
