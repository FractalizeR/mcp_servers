/**
 * Интеграционные тесты для create-queue tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('create-queue integration tests', () => {
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
    it('должен создать очередь с минимальными параметрами', async () => {
      // Arrange
      mockServer.mockCreateQueueSuccess({
        key: 'NEWQ',
        name: 'New Queue',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_queue', {
        key: 'NEWQ',
        name: 'New Queue',
        leadLogin: 'testuser',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queue).toBeDefined();
      expect(response.data.queue.key).toBe('NEWQ');
      expect(response.data.queue.name).toBe('New Queue');
      mockServer.assertAllRequestsDone();
    });

    it('должен создать очередь с полными параметрами', async () => {
      // Arrange
      mockServer.mockCreateQueueSuccess({
        key: 'PROJ',
        name: 'Project Queue',
        description: 'Project queue description',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_queue', {
        key: 'PROJ',
        name: 'Project Queue',
        leadLogin: 'manager',
        description: 'Project queue description',
        defaultTypeKey: 'task',
        defaultPriorityKey: 'normal',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.queue).toBeDefined();
      expect(response.data.queue.key).toBe('PROJ');
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 403 (нет прав)', async () => {
      // Arrange
      mockServer.mockCreateQueue403();

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_queue', {
        key: 'NEWQ',
        name: 'New Queue',
        leadLogin: 'testuser',
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть полную структуру созданной очереди', async () => {
      // Arrange
      mockServer.mockCreateQueueSuccess({ key: 'TEST', name: 'Test' });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_queue', {
        key: 'TEST',
        name: 'Test',
        leadLogin: 'admin',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      const queue = response.data.queue;

      expect(queue).toHaveProperty('id');
      expect(queue).toHaveProperty('key');
      expect(queue).toHaveProperty('name');
      expect(queue).toHaveProperty('lead');
      mockServer.assertAllRequestsDone();
    });
  });
});
