/**
 * Интеграционные тесты для update-queue tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_QUEUE_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('update-queue integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  describe('Happy Path', () => {
    it('должен обновить название очереди', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockUpdateQueueSuccess(queueKey, { name: 'Updated Queue Name' });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_queue', {
        queueId: queueKey,
        name: 'Updated Queue Name',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.queue).toBeDefined();
      expect(response.data.queue.name).toBe('Updated Queue Name');
      mockServer.assertAllRequestsDone();
    });

    it('должен обновить описание очереди', async () => {
      // Arrange
      const queueKey = 'PROJ';
      mockServer.mockUpdateQueueSuccess(queueKey, {
        description: 'New description',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_queue', {
        queueId: queueKey,
        description: 'New description',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.queue).toBeDefined();
      mockServer.assertAllRequestsDone();
    });

    it('должен обновить несколько полей одновременно', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockUpdateQueueSuccess(queueKey, {
        name: 'New Name',
        description: 'New Description',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_queue', {
        queueId: queueKey,
        name: 'New Name',
        description: 'New Description',
        defaultTypeKey: 'bug',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.queue).toBeDefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (очередь не найдена)', async () => {
      // Arrange
      const queueKey = 'NONEXISTENT';
      mockServer.mockUpdateQueue404(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_queue', {
        queueId: queueKey,
        name: 'New Name',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть полную структуру обновленной очереди', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockUpdateQueueSuccess(queueKey, { name: 'Updated' });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_queue', {
        queueId: queueKey,
        name: 'Updated',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      const queue = response.data.queue;

      expect(queue).toHaveProperty('id');
      expect(queue).toHaveProperty('key');
      expect(queue).toHaveProperty('name');
      expect(queue).toHaveProperty('version');
      mockServer.assertAllRequestsDone();
    });
  });
});
