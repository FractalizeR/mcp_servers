/**
 * Интеграционные тесты для get-attachments tool (batch-режим)
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → GetAttachmentsTool → GetAttachmentsOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import {
  createAttachmentListFixture,
  createImageAttachmentFixture,
} from '#helpers/attachment.fixture.js';

describe('get-attachments integration tests (batch)', () => {
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
    it('должен успешно получить список файлов одной задачи', async () => {
      // Arrange
      const issueId = 'QUEUE-1';
      const attachments = createAttachmentListFixture(3);
      mockServer.mockGetAttachmentsSuccess(issueId, attachments);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds: [issueId],
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(0);
      expect(response.successful[0].issueId).toBe(issueId);
      expect(response.successful[0].attachmentsCount).toBe(3);
      expect(response.successful[0].attachments).toHaveLength(3);
      expect(response.successful[0].attachments[0]).toHaveProperty('id');
      expect(response.successful[0].attachments[0]).toHaveProperty('name');

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно получить файлы нескольких задач (batch)', async () => {
      // Arrange
      const issueIds = ['QUEUE-1', 'QUEUE-2'];
      const attachments1 = createAttachmentListFixture(2);
      const attachments2 = createAttachmentListFixture(3);
      mockServer.mockGetAttachmentsSuccess(issueIds[0], attachments1);
      mockServer.mockGetAttachmentsSuccess(issueIds[1], attachments2);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds,
        fields: ['id', 'name', 'size', 'mimetype'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toHaveLength(2);
      expect(response.failed).toHaveLength(0);
      expect(response.successful[0].attachmentsCount).toBe(2);
      expect(response.successful[1].attachmentsCount).toBe(3);

      mockServer.assertAllRequestsDone();
    });

    it('должен вернуть пустой список для задачи без файлов', async () => {
      // Arrange
      const issueId = 'QUEUE-2';
      mockServer.mockGetAttachmentsSuccess(issueId, []);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds: [issueId],
        fields: ['id', 'name', 'size', 'mimetype', 'content', 'createdBy', 'createdAt'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(1);
      expect(response.successful[0].attachmentsCount).toBe(0);
      expect(response.successful[0].attachments).toHaveLength(0);

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
        issueIds: [issueId],
        fields: ['id', 'name', 'size', 'thumbnail'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.successful[0].attachments[0]).toHaveProperty('thumbnail');
      expect(response.successful[0].attachments[0].thumbnail).toContain('thumbnails');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать частичные ошибки (одна задача не найдена)', async () => {
      // Arrange
      const issueIds = ['QUEUE-1', 'NONEXISTENT-1'];
      const attachments = createAttachmentListFixture(2);
      mockServer.mockGetAttachmentsSuccess(issueIds[0], attachments);
      mockServer.mockGetAttachments404(issueIds[1]);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds,
        fields: ['id', 'name', 'size'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].issueId).toBe('NONEXISTENT-1');
      expect(response.failed[0].error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 404 для единственной задачи', async () => {
      // Arrange
      const issueId = 'NONEXISTENT-1';
      mockServer.mockGetAttachments404(issueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds: [issueId],
        fields: ['id', 'name', 'size'],
      });

      // Assert - partial failure is not an error at tool level
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(0);
      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].issueId).toBe(issueId);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом массиве issueIds', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds: [],
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии issueIds', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии fields', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds: ['QUEUE-1'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при пустом issueId в массиве', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_attachments', {
        issueIds: [''],
        fields: ['id', 'name'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });
  });
});
