// tests/integration/tools/api/checklists/update/update-checklist-item.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('update-checklist-item integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен обновить текст элемента', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const checklistItemId = 'item-123';
    const updatedText = 'Updated text';
    const item = { id: checklistItemId, text: updatedText, checked: false };
    mockServer.mockUpdateChecklistItemSuccess(issueKey, checklistItemId, item);

    // Act
    const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
      issueId: issueKey,
      checklistItemId,
      text: updatedText,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.id).toBe(checklistItemId);
    expect(response.data.item.text).toBe(updatedText);
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
      issueId: issueKey,
      checklistItemId,
      checked: true,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.id).toBe(checklistItemId);
    expect(response.data.item.checked).toBe(true);
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
      issueId: issueKey,
      checklistItemId,
      assignee,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.id).toBe(checklistItemId);
    expect(response.data.item.assignee).toBeDefined();
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
      issueId: issueKey,
      checklistItemId,
      deadline,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.id).toBe(checklistItemId);
    expect(response.data.item.deadline).toBe(deadline);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (элемент не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-104';
    const checklistItemId = 'nonexistent-item';
    mockServer.mockUpdateChecklistItem404(issueKey, checklistItemId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_update_checklist_item', {
      issueId: issueKey,
      checklistItemId,
      text: 'Some text',
    });

    // Assert
    expect(result.isError).toBe(true);
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
      issueId: issueKey,
      checklistItemId,
      text: updatedText,
      checked: true,
      assignee,
      deadline,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.id).toBe(checklistItemId);
    expect(response.data.item.text).toBe(updatedText);
    expect(response.data.item.checked).toBe(true);
    expect(response.data.item.assignee).toBeDefined();
    expect(response.data.item.deadline).toBe(deadline);
    mockServer.assertAllRequestsDone();
  });
});
