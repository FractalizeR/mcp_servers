/**
 * Интеграционные тесты для add-checklist-item tool (batch-режим)
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → AddChecklistItemTool → AddChecklistItemOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_CHECKLIST_FIELDS } from '#helpers/test-fields.js';

describe('add-checklist-item integration tests (batch)', () => {
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
    it('должен добавить элемент в чеклист одной задачи', async () => {
      // Arrange
      const issueKey = 'TEST-100';
      const text = 'New checklist item';
      const item = { id: 'item-123', text, checked: false };
      mockServer.mockAddChecklistItemSuccess(issueKey, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: issueKey, text }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toBe(1);
      expect(response.failed).toBe(0);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].issueId).toBe(issueKey);
      expect(response.items[0].itemId).toBe(item.id);
      expect(response.items[0].item.text).toBe(text);

      mockServer.assertAllRequestsDone();
    });

    it('должен добавить элементы в чеклисты нескольких задач (batch)', async () => {
      // Arrange
      const item1 = { id: 'item-1', text: 'Item 1', checked: false };
      const item2 = { id: 'item-2', text: 'Item 2', checked: true };
      mockServer.mockAddChecklistItemSuccess('TEST-100', item1);
      mockServer.mockAddChecklistItemSuccess('TEST-101', item2);

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [
          { issueId: 'TEST-100', text: 'Item 1' },
          { issueId: 'TEST-101', text: 'Item 2', checked: true },
        ],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toBe(2);
      expect(response.failed).toBe(0);
      expect(response.items).toHaveLength(2);

      mockServer.assertAllRequestsDone();
    });

    it('должен добавить элемент с assignee', async () => {
      // Arrange
      const issueKey = 'TEST-101';
      const text = 'Item with assignee';
      const assignee = 'user123';
      const item = {
        id: 'item-456',
        text,
        checked: false,
        assignee: { id: assignee, display: 'Test User' },
      };
      mockServer.mockAddChecklistItemSuccess(issueKey, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: issueKey, text, assignee }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.items[0].item.text).toBe(text);
      expect(response.items[0].item.assignee).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен добавить элемент с deadline', async () => {
      // Arrange
      const issueKey = 'TEST-102';
      const text = 'Item with deadline';
      const deadline = '2025-12-31T23:59:59.000Z';
      const item = { id: 'item-789', text, checked: false, deadline };
      mockServer.mockAddChecklistItemSuccess(issueKey, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: issueKey, text, deadline }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.items[0].item.text).toBe(text);
      expect(response.items[0].item.deadline).toBe(deadline);

      mockServer.assertAllRequestsDone();
    });

    it('должен добавить выполненный элемент', async () => {
      // Arrange
      const issueKey = 'TEST-103';
      const text = 'Completed item';
      const item = { id: 'item-abc', text, checked: true };
      mockServer.mockAddChecklistItemSuccess(issueKey, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: issueKey, text, checked: true }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.items[0].item.text).toBe(text);
      expect(response.items[0].item.checked).toBe(true);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать частичные ошибки (одна задача не найдена)', async () => {
      // Arrange
      const item1 = { id: 'item-1', text: 'Item 1', checked: false };
      mockServer.mockAddChecklistItemSuccess('TEST-100', item1);
      mockServer.mockAddChecklistItem404('NONEXISTENT-1');

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [
          { issueId: 'TEST-100', text: 'Item 1' },
          { issueId: 'NONEXISTENT-1', text: 'Item 2' },
        ],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toBe(1);
      expect(response.failed).toBe(1);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].issueId).toBe('TEST-100');
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].issueId).toBe('NONEXISTENT-1');

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 404 для единственной задачи', async () => {
      // Arrange
      const issueKey = 'NONEXISTENT-1';
      mockServer.mockAddChecklistItem404(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: issueKey, text: 'Test item' }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert - partial failure is not an error at tool level
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toBe(0);
      expect(response.failed).toBe(1);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].issueId).toBe(issueKey);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом массиве items', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии items', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии fields', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: 'TEST-100', text: 'Test' }],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });

    it('должен вернуть ошибку при пустом text в элементе', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
        items: [{ issueId: 'TEST-100', text: '' }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('валидации');
    });
  });
});
