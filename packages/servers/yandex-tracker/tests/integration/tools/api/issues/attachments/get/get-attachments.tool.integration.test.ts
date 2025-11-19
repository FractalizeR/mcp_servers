/**
 * Интеграционные тесты для get-attachments tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → GetAttachmentsTool → GetAttachmentsOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import {
  createAttachmentListFixture,
  createImageAttachmentFixture,
} from '../../../../../../helpers/attachment.fixture.js';

describe('get-attachments integration tests', () => {
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
    it('должен успешно получить список файлов задачи', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachments = createAttachmentListFixture(3);
      mockServer.mockGetAttachmentsSuccess(issueId, attachments);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueId,
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        issueId,
        attachmentsCount: 3,
      });

      expect(response.attachments).toHaveLength(3);
      expect(response.attachments[0]).toHaveProperty('id');
      expect(response.attachments[0]).toHaveProperty('name');
      expect(response.attachments[0]).toHaveProperty('mimetype');
      expect(response.attachments[0]).toHaveProperty('size');
      expect(response.attachments[0]).toHaveProperty('content');
      expect(response.attachments[0]).toHaveProperty('createdBy');
      expect(response.attachments[0]).toHaveProperty('createdAt');

      mockServer.assertAllRequestsDone();
    });

    it('должен вернуть пустой список для задачи без файлов', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      mockServer.mockGetAttachmentsSuccess(issueId, []);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueId,
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        issueId,
        attachmentsCount: 0,
        attachments: [],
      });

      mockServer.assertAllRequestsDone();
    });

    it('должен включать thumbnail для изображений', async () => {
      // Arrange
      const issueId = 'QUEUE-3';
      const imageAttachment = createImageAttachmentFixture({
        name: 'screenshot.png',
      });
      mockServer.mockGetAttachmentsSuccess(issueId, [imageAttachment]);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueId,
        fields: ['id', 'name', 'size', 'thumbnail'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.attachments[0]).toHaveProperty('thumbnail');
      expect(response.attachments[0].thumbnail).toContain('thumbnails');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (задача не найдена)', async () => {
      // Arrange
      const issueId = 'NONEXISTENT-1';
      mockServer.mockGetAttachments404(issueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueId,
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
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
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueId: '',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии issueId', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии fields', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueId: 'QUEUE-1',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });
  });
});
