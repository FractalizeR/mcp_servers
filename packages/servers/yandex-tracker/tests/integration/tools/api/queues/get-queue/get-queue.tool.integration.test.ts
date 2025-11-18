/**
 * Интеграционные тесты для get-queue tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-queue integration tests', () => {
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
    it('должен получить очередь по ключу', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockGetQueueSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queue', {
        queueId: queueKey,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queue).toBeDefined();
      expect(response.data.queue.key).toBe(queueKey);
      mockServer.assertAllRequestsDone();
    });

    it('должен получить очередь с expand параметром', async () => {
      // Arrange
      const queueKey = 'PROJ';
      mockServer.mockGetQueueSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queue', {
        queueId: queueKey,
        expand: 'projects',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queue).toBeDefined();
      expect(response.data.queue.key).toBe(queueKey);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (очередь не найдена)', async () => {
      // Arrange
      const queueKey = 'NONEXISTENT';
      mockServer.mockGetQueue404(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queue', {
        queueId: queueKey,
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть полную структуру очереди', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockGetQueueSuccess(queueKey, {
        description: 'Test queue',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queue', {
        queueId: queueKey,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      const queue = response.data.queue;

      expect(queue).toHaveProperty('id');
      expect(queue).toHaveProperty('key');
      expect(queue).toHaveProperty('name');
      expect(queue).toHaveProperty('lead');
      expect(queue).toHaveProperty('assignAuto');
      expect(queue).toHaveProperty('defaultType');
      expect(queue).toHaveProperty('defaultPriority');
      mockServer.assertAllRequestsDone();
    });
  });
});
