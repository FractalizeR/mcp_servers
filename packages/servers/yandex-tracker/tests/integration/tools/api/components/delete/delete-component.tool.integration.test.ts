/**
 * Интеграционные тесты для delete-component tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('delete-component integration tests', () => {
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
    it('должен успешно удалить компонент', async () => {
      // Arrange
      const componentId = 'comp123';
      mockServer.mockDeleteComponentSuccess(componentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_component', {
        componentId,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.success).toBe(true);
      mockServer.assertAllRequestsDone();
    });

    it('должен успешно удалить несколько компонентов последовательно', async () => {
      // Arrange
      const componentId1 = 'comp1';
      const componentId2 = 'comp2';
      mockServer.mockDeleteComponentSuccess(componentId1);
      mockServer.mockDeleteComponentSuccess(componentId2);

      // Act
      const result1 = await client.callTool('fr_yandex_tracker_delete_component', {
        componentId: componentId1,
      });
      const result2 = await client.callTool('fr_yandex_tracker_delete_component', {
        componentId: componentId2,
      });

      // Assert
      expect(result1.isError).toBeUndefined();
      expect(result2.isError).toBeUndefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (компонент не найден)', async () => {
      // Arrange
      const componentId = 'nonexistent';
      mockServer.mockDeleteComponent404(componentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_component', {
        componentId,
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть корректную структуру ответа при успешном удалении', async () => {
      // Arrange
      const componentId = 'comp456';
      mockServer.mockDeleteComponentSuccess(componentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_delete_component', {
        componentId,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('success');
      expect(response.data.success).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });
});
