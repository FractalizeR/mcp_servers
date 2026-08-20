/**
 * Интеграционные тесты для update-checklist-item tool (batch-режим)
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → UpdateChecklistItemTool → UpdateChecklistItemOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_CHECKLIST_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('update-checklist-item integration tests (batch)', () => {
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
    it('должен обновить элемент в чеклисте одной задачи', async () => {
      // Arrange
      const issueKey = 'TEST-100';
      const checklistItemId = 'item-123';
      const updatedText = 'Updated text';
      const item = { id: checklistItemId, text: updatedText, checked: false };
      mockServer.mockUpdateChecklistItemSuccess(issueKey, checklistItemId, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: issueKey, checklistItemId, text: updatedText }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(0);
      expect(response.successful[0].issueId).toBe(issueKey);
      expect(response.successful[0].checklistItemId).toBe(checklistItemId);
      expect(response.successful[0].item.text).toBe(updatedText);

      mockServer.assertAllRequestsDone();
    });

    it('должен обновить элементы в чеклистах нескольких задач (batch)', async () => {
      // Arrange
      const item1 = { id: 'item-1', text: 'Updated 1', checked: false };
      const item2 = { id: 'item-2', text: 'Item 2', checked: true };
      mockServer.mockUpdateChecklistItemSuccess('TEST-100', 'item-1', item1);
      mockServer.mockUpdateChecklistItemSuccess('TEST-101', 'item-2', item2);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [
          { issueId: 'TEST-100', checklistItemId: 'item-1', text: 'Updated 1' },
          { issueId: 'TEST-101', checklistItemId: 'item-2', checked: true },
        ],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toHaveLength(2);
      expect(response.failed).toHaveLength(0);

      mockServer.assertAllRequestsDone();
    });

    it('должен отметить элемент как выполненный', async () => {
      // Arrange
      const issueKey = 'TEST-101';
      const checklistItemId = 'item-456';
      const item = { id: checklistItemId, text: 'Item text', checked: true };
      mockServer.mockUpdateChecklistItemSuccess(issueKey, checklistItemId, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: issueKey, checklistItemId, checked: true }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.successful[0].item.checked).toBe(true);

      mockServer.assertAllRequestsDone();
    });

    it('должен обновить assignee элемента', async () => {
      // Arrange
      const issueKey = 'TEST-102';
      const checklistItemId = 'item-789';
      const assignee = 'user456';
      const item = {
        id: checklistItemId,
        text: 'Item text',
        checked: false,
        assignee: { id: assignee, display: 'New User' },
      };
      mockServer.mockUpdateChecklistItemSuccess(issueKey, checklistItemId, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: issueKey, checklistItemId, assignee }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.successful[0].item.assignee).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обновить deadline элемента', async () => {
      // Arrange
      const issueKey = 'TEST-103';
      const checklistItemId = 'item-abc';
      const deadline = '2025-12-31T23:59:59.000Z';
      const item = { id: checklistItemId, text: 'Item text', checked: false, deadline };
      mockServer.mockUpdateChecklistItemSuccess(issueKey, checklistItemId, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: issueKey, checklistItemId, deadline }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.successful[0].item.deadline).toBe(deadline);

      mockServer.assertAllRequestsDone();
    });

    it('должен обновить несколько полей одновременно', async () => {
      // Arrange
      const issueKey = 'TEST-105';
      const checklistItemId = 'item-multi';
      const updatedText = 'Updated multi-field';
      const assignee = 'user789';
      const deadline = '2025-06-30T23:59:59.000Z';
      const item = {
        id: checklistItemId,
        text: updatedText,
        checked: true,
        assignee: { id: assignee, display: 'Multi User' },
        deadline,
      };
      mockServer.mockUpdateChecklistItemSuccess(issueKey, checklistItemId, item);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [
          {
            issueId: issueKey,
            checklistItemId,
            text: updatedText,
            checked: true,
            assignee,
            deadline,
          },
        ],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.successful[0].item.text).toBe(updatedText);
      expect(response.successful[0].item.checked).toBe(true);
      expect(response.successful[0].item.assignee).toBeDefined();
      expect(response.successful[0].item.deadline).toBe(deadline);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать частичные ошибки (один элемент не найден)', async () => {
      // Arrange
      const item1 = { id: 'item-1', text: 'Updated 1', checked: false };
      mockServer.mockUpdateChecklistItemSuccess('TEST-100', 'item-1', item1);
      mockServer.mockUpdateChecklistItem404('NONEXISTENT-1', 'item-2');

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [
          { issueId: 'TEST-100', checklistItemId: 'item-1', text: 'Updated 1' },
          { issueId: 'NONEXISTENT-1', checklistItemId: 'item-2', text: 'Item 2' },
        ],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(2);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(1);
      expect(response.successful[0].issueId).toBe('TEST-100');
      expect(response.failed[0].issueId).toBe('NONEXISTENT-1');

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 404 для единственной задачи', async () => {
      // Arrange
      const issueKey = 'NONEXISTENT-1';
      const checklistItemId = 'item-1';
      mockServer.mockUpdateChecklistItem404(issueKey, checklistItemId);

      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: issueKey, checklistItemId, text: 'Test item' }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert - partial failure is not an error at tool level
      expect(result.isError).toBeUndefined();
      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(0);
      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].issueId).toBe(issueKey);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом массиве items', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии items', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('валидации');
    });

    it('должен вернуть ошибку при отсутствии fields', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: 'TEST-100', checklistItemId: 'item-1', text: 'Test' }],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('валидации');
    });

    it('должен вернуть ошибку при пустом checklistItemId в элементе', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
        items: [{ issueId: 'TEST-100', checklistItemId: '', text: 'Test' }],
        fields: STANDARD_CHECKLIST_FIELDS,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('валидации');
    });
  });
});
