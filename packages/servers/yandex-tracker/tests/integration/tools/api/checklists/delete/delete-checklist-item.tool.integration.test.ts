// tests/integration/tools/api/checklists/delete/delete-checklist-item.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('delete-checklist-item integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен удалить элемент из чеклиста', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const checklistItemId = 'item-123';
    mockServer.mockDeleteChecklistItemSuccess(issueKey, checklistItemId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      issueId: issueKey,
      checklistItemId,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.message).toBeDefined();
    expect(response.data.itemId).toBe(checklistItemId);
    expect(response.data.issueId).toBe(issueKey);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (элемент не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const checklistItemId = 'nonexistent-item';
    mockServer.mockDeleteChecklistItem404(issueKey, checklistItemId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      issueId: issueKey,
      checklistItemId,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен удалить элемент с валидным ID', async () => {
    // Arrange
    const issueKey = 'TEST-102';
    const checklistItemId = 'valid-item-id-456';
    mockServer.mockDeleteChecklistItemSuccess(issueKey, checklistItemId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      issueId: issueKey,
      checklistItemId,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.message).toBeDefined();
    expect(response.data.itemId).toBe(checklistItemId);
    expect(response.data.issueId).toBe(issueKey);
    mockServer.assertAllRequestsDone();
  });
});
