/**
 * Интеграционные тесты для get-components tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-components integration tests', () => {
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
    it('должен получить список компонентов очереди', async () => {
      // Arrange
      const queueId = 'TEST';
      mockServer.mockGetComponentsSuccess(queueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_components', {
        queueId,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.components).toBeDefined();
      expect(Array.isArray(response.data.components)).toBe(true);
      expect(response.data.components.length).toBeGreaterThan(0);
      mockServer.assertAllRequestsDone();
    });

    it('должен получить пустой список компонентов', async () => {
      // Arrange
      const queueId = 'EMPTY';
      mockServer.mockGetComponentsEmpty(queueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_components', {
        queueId,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.components).toBeDefined();
      expect(Array.isArray(response.data.components)).toBe(true);
      expect(response.data.components.length).toBe(0);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (очередь не найдена)', async () => {
      // Arrange
      const queueId = 'NONEXISTENT';
      mockServer.mockGetComponents404(queueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_components', {
        queueId,
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть корректную структуру компонента', async () => {
      // Arrange
      const queueId = 'TEST';
      mockServer.mockGetComponentsSuccess(queueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_components', {
        queueId,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      const component = response.data.components[0];

      expect(component).toHaveProperty('id');
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('queue');
      expect(component).toHaveProperty('assignAuto');
      mockServer.assertAllRequestsDone();
    });
  });
});
