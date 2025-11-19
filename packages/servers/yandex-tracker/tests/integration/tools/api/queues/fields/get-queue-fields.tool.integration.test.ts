/**
 * Интеграционные тесты для get-queue-fields tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import { STANDARD_QUEUE_FIELD_FIELDS } from '@helpers/test-fields.js';

describe('get-queue-fields integration tests', () => {
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
    it('должен получить список полей очереди', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockGetQueueFieldsSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queue_fields', {
        queueId: queueKey,
        fields: STANDARD_QUEUE_FIELD_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.fields).toBeDefined();
      expect(Array.isArray(response.data.fields)).toBe(true);
      expect(response.data.fields.length).toBeGreaterThan(0);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть корректную структуру полей', async () => {
      // Arrange
      const queueKey = 'TEST';
      mockServer.mockGetQueueFieldsSuccess(queueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_queue_fields', {
        queueId: queueKey,
        fields: STANDARD_QUEUE_FIELD_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      const field = response.data.fields[0];

      expect(field).toHaveProperty('id');
      expect(field).toHaveProperty('key');
      expect(field).toHaveProperty('name');
      expect(field).toHaveProperty('type');
      expect(field).toHaveProperty('required');
      mockServer.assertAllRequestsDone();
    });
  });
});
