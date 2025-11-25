/**
 * Интеграционные тесты для get-checklist tool (batch-режим)
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → GetChecklistTool → GetChecklistOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_CHECKLIST_FIELDS } from '#helpers/test-fields.js';

describe('get-checklist integration tests (batch)', () => {
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
    it('должен успешно получить чеклист одной задачи', async () => {
      // Arrange
      const issueKey = 'TEST-100';
      const checklist = [
        { id: 'item-1', text: 'First item', checked: false },
        { id: 'item-2', text: 'Second item', checked: true },
        { id: 'item-3', text: 'Third item', checked: false },
      ];
      mockServer.mockGetChecklistSuccess(issueKey, checklist);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: [issueKey],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(0);
      expect(response.successful[0].issueId).toBe(issueKey);
      expect(response.successful[0].itemsCount).toBe(3);
      expect(response.successful[0].checklist).toHaveLength(3);

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно получить чеклисты нескольких задач (batch)', async () => {
      // Arrange
      const issueIds = ['TEST-100', 'TEST-101'];
      const checklist1 = [
        { id: 'item-1', text: 'First item', checked: false },
        { id: 'item-2', text: 'Second item', checked: true },
      ];
      const checklist2 = [
        { id: 'item-3', text: 'Third item', checked: false },
        { id: 'item-4', text: 'Fourth item', checked: false },
        { id: 'item-5', text: 'Fifth item', checked: true },
      ];
      mockServer.mockGetChecklistSuccess(issueIds[0], checklist1);
      mockServer.mockGetChecklistSuccess(issueIds[1], checklist2);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds,
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toHaveLength(2);
      expect(response.failed).toHaveLength(0);
      expect(response.successful[0].itemsCount).toBe(2);
      expect(response.successful[1].itemsCount).toBe(3);

      mockServer.assertAllRequestsDone();
    });

    it('должен получить пустой чеклист', async () => {
      // Arrange
      const issueKey = 'TEST-101';
      mockServer.mockGetChecklistSuccess(issueKey, []);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: [issueKey],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(1);
      expect(response.successful[0].itemsCount).toBe(0);
      expect(response.successful[0].checklist).toHaveLength(0);

      mockServer.assertAllRequestsDone();
    });

    it('должен получить чеклист с несколькими элементами', async () => {
      // Arrange
      const issueKey = 'TEST-102';
      const checklist = [
        { id: 'item-1', text: 'Item 1', checked: false },
        { id: 'item-2', text: 'Item 2', checked: false },
        { id: 'item-3', text: 'Item 3', checked: false },
        { id: 'item-4', text: 'Item 4', checked: false },
        { id: 'item-5', text: 'Item 5', checked: false },
      ];
      mockServer.mockGetChecklistSuccess(issueKey, checklist);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: [issueKey],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.successful[0].itemsCount).toBe(5);
      expect(response.successful[0].checklist.length).toBe(5);
      // Проверяем, что все элементы не выполнены
      response.successful[0].checklist.forEach((item: { checked: boolean }) => {
        expect(item.checked).toBe(false);
      });

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать частичные ошибки (одна задача не найдена)', async () => {
      // Arrange
      const issueIds = ['TEST-100', 'NONEXISTENT-1'];
      const checklist = [
        { id: 'item-1', text: 'First item', checked: false },
        { id: 'item-2', text: 'Second item', checked: true },
      ];
      mockServer.mockGetChecklistSuccess(issueIds[0], checklist);
      mockServer.mockGetChecklist404(issueIds[1]);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds,
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].issueId).toBe('NONEXISTENT-1');
      expect(response.failed[0].error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 404 для единственной задачи', async () => {
      // Arrange
      const issueKey = 'NONEXISTENT-1';
      mockServer.mockGetChecklist404(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: [issueKey],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert - partial failure is not an error at tool level
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(0);
      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].issueId).toBe(issueKey);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом массиве issueIds', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: [],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии issueIds', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии fields', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: ['TEST-100'],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при пустом issueId в массиве', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_checklist', {
        issueIds: [''],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });
  });
});
