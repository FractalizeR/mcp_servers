/**
 * Интеграционные тесты для get-thumbnail tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → GetThumbnailTool → GetThumbnailOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-thumbnail integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    // ВАЖНО: создаём MCP клиент СНАЧАЛА, чтобы получить axios instance
    client = await createTestClient({
      logLevel: 'silent', // Отключаем логи в тестах
    });

    // Затем создаём MockServer с axios instance из клиента
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    // Очищаем моки после каждого теста
    mockServer.cleanup();
  });

  describe('Happy Path', () => {
    it('должен успешно получить миниатюру изображения в base64', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = '12345';

      // Мокируем запрос на список файлов для получения метаданных
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: 'screenshot.png',
          mimetype: 'image/png',
          size: 1024,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/screenshot.png`,
          thumbnail: `https://api.tracker.yandex.net/v2/issues/${issueId}/thumbnails/${attachmentId}`,
        },
      ]);
      mockServer.mockGetThumbnailSuccess(issueId, attachmentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {
        issueId,
        attachmentId,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        issueId,
        attachmentId,
      });

      expect(response).toHaveProperty('base64');
      expect(response).toHaveProperty('size');
      expect(response).toHaveProperty('mimetype');
      expect(typeof response.base64).toBe('string');
      expect(response.base64.length).toBeGreaterThan(0);

      mockServer.assertAllRequestsDone();
    });

    it('должен вернуть метаданные миниатюры', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      const attachmentId = '67890';

      // Мокируем запрос на список файлов для получения метаданных
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: 'photo.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/photo.jpg`,
          thumbnail: `https://api.tracker.yandex.net/v2/issues/${issueId}/thumbnails/${attachmentId}`,
        },
      ]);
      mockServer.mockGetThumbnailSuccess(issueId, attachmentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {
        issueId,
        attachmentId,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.size).toBeGreaterThan(0);
      expect(response).toHaveProperty('mimetype');
      expect(response.mimetype).toContain('image');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (миниатюра не найдена)', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = 'nonexistent';

      // Мокируем запрос на список файлов, но файл не найден
      mockServer.mockGetAttachments404(issueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {
        issueId,
        attachmentId,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка');

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку когда файл не является изображением', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      const attachmentId = '12345';

      // Мокируем запрос на список файлов - файл есть, но метаданные не содержат thumbnail
      mockServer.mockGetAttachmentsSuccess(issueId, [
        {
          id: attachmentId,
          name: 'document.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          createdBy: { id: '1', display: 'Test User' },
          createdAt: '2024-01-01T00:00:00.000Z',
          self: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}`,
          content: `https://api.tracker.yandex.net/v2/issues/${issueId}/attachments/${attachmentId}/document.pdf`,
          // Нет thumbnail для не-изображений
        },
      ]);
      // Миниатюра доступна только для изображений, для других типов файлов будет 404
      mockServer.mockGetThumbnail404(issueId, attachmentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {
        issueId,
        attachmentId,
      });

      // Assert
      expect(result.isError).toBe(true);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом issueId', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {
        issueId: '',
        attachmentId: '12345',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при пустом attachmentId', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {
        issueId: 'QUEUE-1',
        attachmentId: '',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии обязательных параметров', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_thumbnail', {});

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });
  });
});
