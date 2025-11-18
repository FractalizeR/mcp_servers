/**
 * Интеграционные тесты для create-component tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('create-component integration tests', () => {
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
    it('должен создать компонент с минимальными параметрами', async () => {
      // Arrange
      const queueId = 'TEST';
      mockServer.mockCreateComponentSuccess(queueId, {
        name: 'New Component',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_component', {
        queueId,
        name: 'New Component',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.component).toBeDefined();
      expect(response.data.component.name).toBe('New Component');
      mockServer.assertAllRequestsDone();
    });

    it('должен создать компонент с полными параметрами', async () => {
      // Arrange
      const queueId = 'PROJ';
      mockServer.mockCreateComponentSuccess(queueId, {
        name: 'Backend',
        description: 'Backend services',
        assignAuto: true,
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_component', {
        queueId,
        name: 'Backend',
        description: 'Backend services',
        lead: 'testuser',
        assignAuto: true,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.component).toBeDefined();
      expect(response.data.component.name).toBe('Backend');
      mockServer.assertAllRequestsDone();
    });

    it('должен создать компонент с автоназначением', async () => {
      // Arrange
      const queueId = 'TEST';
      mockServer.mockCreateComponentSuccess(queueId, {
        name: 'Frontend',
        assignAuto: true,
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_component', {
        queueId,
        name: 'Frontend',
        assignAuto: true,
        lead: 'frontend-lead',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.component).toBeDefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 403 (нет прав)', async () => {
      // Arrange
      const queueId = 'RESTRICTED';
      mockServer.mockCreateComponent403(queueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_component', {
        queueId,
        name: 'New Component',
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 404 (очередь не найдена)', async () => {
      // Arrange
      const queueId = 'NONEXISTENT';
      mockServer.mockCreateComponent404(queueId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_component', {
        queueId,
        name: 'New Component',
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть полную структуру созданного компонента', async () => {
      // Arrange
      const queueId = 'TEST';
      mockServer.mockCreateComponentSuccess(queueId, { name: 'Test Component' });

      // Act
      const result = await client.callTool('fr_yandex_tracker_create_component', {
        queueId,
        name: 'Test Component',
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      const component = response.data.component;

      expect(component).toHaveProperty('id');
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('queue');
      expect(component).toHaveProperty('assignAuto');
      mockServer.assertAllRequestsDone();
    });
  });
});
