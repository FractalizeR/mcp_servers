/**
 * Интеграционные тесты для get-queues tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-queues integration tests', () => {
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
    it('должен получить список всех очередей', async () => {
      // Arrange
      mockServer.mockGetQueuesSuccess();

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queues', {});

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queues).toBeDefined();
      expect(Array.isArray(response.data.queues)).toBe(true);
      expect(response.data.queues.length).toBeGreaterThan(0);
      mockServer.assertAllRequestsDone();
    });

    it('должен получить пустой список очередей', async () => {
      // Arrange
      mockServer.mockGetQueuesEmpty();

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queues', {});

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queues).toBeDefined();
      expect(Array.isArray(response.data.queues)).toBe(true);
      expect(response.data.queues.length).toBe(0);
      mockServer.assertAllRequestsDone();
    });

    it('должен передать параметры пагинации', async () => {
      // Arrange
      mockServer.mockGetQueuesSuccess();

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queues', {
        perPage: 50,
        page: 2,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queues).toBeDefined();
      mockServer.assertAllRequestsDone();
    });

    it('должен передать параметр expand', async () => {
      // Arrange
      mockServer.mockGetQueuesSuccess();

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queues', {
        expand: 'projects',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queues).toBeDefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть корректную структуру очереди', async () => {
      // Arrange
      mockServer.mockGetQueuesSuccess();

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queues', {});

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      const queue = response.data.queues[0];

      expect(queue).toHaveProperty('id');
      expect(queue).toHaveProperty('key');
      expect(queue).toHaveProperty('name');
      expect(queue).toHaveProperty('lead');
      expect(queue).toHaveProperty('assignAuto');
      mockServer.assertAllRequestsDone();
    });
  });
});
