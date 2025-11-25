// tests/integration/tools/api/checklists/delete/delete-checklist-item.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';

describe('delete-checklist-item integration tests (batch)', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен удалить элемент из чеклиста (batch)', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const itemId = 'item-123';
    mockServer.mockDeleteChecklistItemSuccess(issueKey, itemId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      items: [{ issueId: issueKey, itemId }],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.successful).toBe(1);
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items[0].success).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (элемент не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const itemId = 'nonexistent-item';
    mockServer.mockDeleteChecklistItem404(issueKey, itemId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      items: [{ issueId: issueKey, itemId }],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.failed).toBe(1);
    expect(response.data.errors).toHaveLength(1);
    mockServer.assertAllRequestsDone();
  });

  it('должен удалить несколько элементов', async () => {
    // Arrange
    const issueKey1 = 'TEST-102';
    const itemId1 = 'item-456';
    const issueKey2 = 'TEST-103';
    const itemId2 = 'item-789';
    mockServer.mockDeleteChecklistItemSuccess(issueKey1, itemId1);
    mockServer.mockDeleteChecklistItemSuccess(issueKey2, itemId2);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      items: [
        { issueId: issueKey1, itemId: itemId1 },
        { issueId: issueKey2, itemId: itemId2 },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(2);
    expect(response.data.successful).toBe(2);
    expect(response.data.failed).toBe(0);
    expect(response.data.items).toHaveLength(2);
    expect(response.data.errors).toHaveLength(0);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать частичную ошибку в batch', async () => {
    // Arrange
    const issueKey1 = 'TEST-104';
    const itemId1 = 'item-good';
    const issueKey2 = 'TEST-105';
    const itemId2 = 'item-bad';
    mockServer.mockDeleteChecklistItemSuccess(issueKey1, itemId1);
    mockServer.mockDeleteChecklistItem404(issueKey2, itemId2);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_checklist_item', {
      items: [
        { issueId: issueKey1, itemId: itemId1 },
        { issueId: issueKey2, itemId: itemId2 },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(2);
    expect(response.data.successful).toBe(1);
    expect(response.data.failed).toBe(1);
    expect(response.data.items).toHaveLength(1);
    expect(response.data.errors).toHaveLength(1);
    mockServer.assertAllRequestsDone();
  });
});
