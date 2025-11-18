/**
 * Интеграционные тесты для delete-attachment tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → DeleteAttachmentTool → DeleteAttachmentOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('delete-attachment integration tests', () => {
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
    it('должен успешно удалить файл из задачи', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = '12345';

      mockServer.mockDeleteAttachmentSuccess(issueId, attachmentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_attachment', {
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
        deleted: true,
      });

      expect(response).toHaveProperty('message');
      expect(response.message).toContain('успешно удален');

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно удалить файл с другим attachmentId', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      const attachmentId = '67890';

      mockServer.mockDeleteAttachmentSuccess(issueId, attachmentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_attachment', {
        issueId,
        attachmentId,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.deleted).toBe(true);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (файл не найден)', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachmentId = 'nonexistent';

      mockServer.mockDeleteAttachment404(issueId, attachmentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_attachment', {
        issueId,
        attachmentId,
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
      const result = await client.callTool('fr_yandex_tracker_delete_attachment', {
        issueId: '',
        attachmentId: '12345',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при пустом attachmentId', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_attachment', {
        issueId: 'QUEUE-1',
        attachmentId: '',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии обязательных параметров', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_attachment', {});

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });
  });
});
