/**
 * Интеграционные тесты для create-queue tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_QUEUE_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

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
        lead: 'testuser',
        defaultType: 'task',
        defaultPriority: 'normal',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
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
        lead: 'manager',
        defaultType: 'task',
        defaultPriority: 'normal',
        description: 'Project queue description',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
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
        lead: 'testuser',
        defaultType: 'task',
        defaultPriority: 'normal',
        fields: STANDARD_QUEUE_FIELDS,
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
        lead: 'admin',
        defaultType: 'task',
        defaultPriority: 'normal',
        fields: STANDARD_QUEUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      const queue = response.data.queue;

      expect(queue).toHaveProperty('id');
      expect(queue).toHaveProperty('key');
      expect(queue).toHaveProperty('name');
      expect(queue).toHaveProperty('lead');
      mockServer.assertAllRequestsDone();
    });
  });
});
