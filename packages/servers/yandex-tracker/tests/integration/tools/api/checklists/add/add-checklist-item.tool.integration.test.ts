// tests/integration/tools/api/checklists/add/add-checklist-item.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('add-checklist-item integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен добавить элемент в чеклист', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const text = 'New checklist item';
    const item = { id: 'item-123', text, checked: false };
    mockServer.mockAddChecklistItemSuccess(issueKey, item);

    // Act
    const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
      issueId: issueKey,
      text,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.text).toBe(text);
    expect(response.data.itemId).toBe(item.id);
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
      issueId: issueKey,
      text,
      assignee,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.text).toBe(text);
    expect(response.data.item.assignee).toBeDefined();
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
      issueId: issueKey,
      text,
      deadline,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.text).toBe(text);
    expect(response.data.item.deadline).toBe(deadline);
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
      issueId: issueKey,
      text,
      checked: true,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.item).toBeDefined();
    expect(response.data.item.text).toBe(text);
    expect(response.data.item.checked).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockAddChecklistItem404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_add_checklist_item', {
      issueId: issueKey,
      text: 'Test item',
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });
});
