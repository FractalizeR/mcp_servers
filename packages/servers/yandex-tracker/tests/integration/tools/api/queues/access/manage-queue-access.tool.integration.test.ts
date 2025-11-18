/**
 * Интеграционные тесты для manage-queue-access tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('manage-queue-access integration tests', () => {
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
    it('должен добавить пользователю доступ к очереди', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockManageQueueAccessSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
        queueId: queueKey,
        action: 'add',
        subjects: ['testuser'],
        role: 'follower',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data).toBeDefined();
      expect(response.data.permissions).toBeDefined();
      expect(Array.isArray(response.data.permissions)).toBe(true);
      mockServer.assertAllRequestsDone();
    });

    it('должен удалить у пользователя доступ к очереди', async () => {
      // Arrange
      const queueKey = 'PROJ';
      mockServer.mockManageQueueAccessSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
        queueId: queueKey,
        action: 'remove',
        subjects: ['testuser'],
        role: 'follower',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data).toBeDefined();
      mockServer.assertAllRequestsDone();
    });

    it('должен добавить доступ с ролью teamMember', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockManageQueueAccessSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
        queueId: queueKey,
        action: 'add',
        subjects: ['developer'],
        role: 'team-member',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data).toBeDefined();
      mockServer.assertAllRequestsDone();
    });

    it('должен добавить доступ с ролью access', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockManageQueueAccessSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
        queueId: queueKey,
        action: 'add',
        subjects: ['assignee1'],
        role: 'access',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data).toBeDefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 403 (нет прав)', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockManageQueueAccess403(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
        queueId: queueKey,
        action: 'add',
        subjects: ['testuser'],
        role: 'follower',
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });
});
