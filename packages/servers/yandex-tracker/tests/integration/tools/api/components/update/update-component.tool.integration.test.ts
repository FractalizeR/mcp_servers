/**
 * Интеграционные тесты для update-component tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_COMPONENT_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('update-component integration tests', () => {
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
    it('должен обновить название компонента', async () => {
      // Arrange
      const componentId = 'comp123';
      mockServer.mockUpdateComponentSuccess(componentId, { name: 'Updated Component' });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_component', {
        componentId,
        name: 'Updated Component',
        fields: STANDARD_COMPONENT_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.component).toBeDefined();
      expect(response.data.component.name).toBe('Updated Component');
      mockServer.assertAllRequestsDone();
    });

    it('должен обновить описание компонента', async () => {
      // Arrange
      const componentId = 'comp456';
      mockServer.mockUpdateComponentSuccess(componentId, {
        description: 'New description',
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_component', {
        componentId,
        description: 'New description',
        fields: STANDARD_COMPONENT_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.component).toBeDefined();
      mockServer.assertAllRequestsDone();
    });

    it('должен обновить несколько полей одновременно', async () => {
      // Arrange
      const componentId = 'comp789';
      mockServer.mockUpdateComponentSuccess(componentId, {
        name: 'New Name',
        description: 'New Description',
        assignAuto: true,
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_component', {
        componentId,
        name: 'New Name',
        description: 'New Description',
        assignAuto: true,
        fields: STANDARD_COMPONENT_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.component).toBeDefined();
      mockServer.assertAllRequestsDone();
    });

    it('должен обновить руководителя и автоназначение', async () => {
      // Arrange
      const componentId = 'comp999';
      mockServer.mockUpdateComponentSuccess(componentId, {
        assignAuto: true,
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_component', {
        componentId,
        lead: 'newlead',
        assignAuto: true,
        fields: STANDARD_COMPONENT_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      expect(response.data.component).toBeDefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 404 (компонент не найден)', async () => {
      // Arrange
      const componentId = 'nonexistent';
      mockServer.mockUpdateComponent404(componentId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_component', {
        componentId,
        name: 'New Name',
        fields: STANDARD_COMPONENT_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Response Structure', () => {
    it('должен вернуть полную структуру обновленного компонента', async () => {
      // Arrange
      const componentId = 'comp123';
      mockServer.mockUpdateComponentSuccess(componentId, { name: 'Updated' });

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_component', {
        componentId,
        name: 'Updated',
        fields: STANDARD_COMPONENT_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(getTextContent(result));
      const component = response.data.component;

      expect(component).toHaveProperty('id');
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('queue');
      expect(component).toHaveProperty('assignAuto');
      mockServer.assertAllRequestsDone();
    });
  });
});
