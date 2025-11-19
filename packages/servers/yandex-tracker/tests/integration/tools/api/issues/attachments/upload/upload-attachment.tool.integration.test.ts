/**
 * Интеграционные тесты для upload-attachment tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → UploadAttachmentTool → UploadAttachmentOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import { createAttachmentFixture } from '../../../../../../helpers/attachment.fixture.js';

describe('upload-attachment integration tests', () => {
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
    it('должен успешно загрузить файл через base64', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const filename = 'test-file.txt';
      const fileContent = Buffer.from('test file content').toString('base64');
      const uploadedAttachment = createAttachmentFixture({
        name: filename,
      });

      mockServer.mockUploadAttachmentSuccess(issueId, uploadedAttachment);

      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId,
        filename,
        fileContent,
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        issueId,
      });

      expect(response.attachment).toHaveProperty('id');
      expect(response.attachment).toHaveProperty('name', filename);
      expect(response.attachment).toHaveProperty('mimetype');
      expect(response.attachment).toHaveProperty('size');
      expect(response.attachment).toHaveProperty('content');
      expect(response.attachment).toHaveProperty('createdBy');
      expect(response.attachment).toHaveProperty('createdAt');

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно загрузить файл с указанным mimetype', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      const filename = 'document.pdf';
      const fileContent = Buffer.from('PDF content').toString('base64');
      const mimetype = 'application/pdf';
      const uploadedAttachment = createAttachmentFixture({
        name: filename,
        mimetype,
      });

      mockServer.mockUploadAttachmentSuccess(issueId, uploadedAttachment);

      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId,
        filename,
        fileContent,
        mimetype,
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.attachment).toHaveProperty('mimetype', mimetype);

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно загрузить изображение', async () => {
      // Arrange
      const issueId = 'QUEUE-3';
      const filename = 'screenshot.png';
      const fileContent = Buffer.from('PNG image data').toString('base64');
      const uploadedAttachment = createAttachmentFixture({
        name: filename,
        mimetype: 'image/png',
        thumbnail: `https://api.tracker.yandex.net/v2/issues/${issueId}/thumbnails/12345`,
      });

      mockServer.mockUploadAttachmentSuccess(issueId, uploadedAttachment);

      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId,
        filename,
        fileContent,
        mimetype: 'image/png',
        fields: ['id', 'name', 'size', 'mimetype', 'createdBy', 'createdAt', 'thumbnail'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.attachment).toHaveProperty('thumbnail');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 403 (доступ запрещён)', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const filename = 'test.txt';
      const fileContent = Buffer.from('test').toString('base64');

      mockServer.mockUploadAttachment403(issueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId,
        filename,
        fileContent,
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
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId: '',
        filename: 'test.txt',
        fileContent: 'dGVzdA==',
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при пустом filename', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId: 'QUEUE-1',
        filename: '',
        fileContent: 'dGVzdA==',
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии fileContent и filePath', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId: 'QUEUE-1',
        filename: 'test.txt',
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при отсутствии fields', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_upload_attachment', {
        issueId: 'QUEUE-1',
        filename: 'test.txt',
        fileContent: 'dGVzdA==',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });
  });
});
