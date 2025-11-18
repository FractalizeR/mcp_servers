// tests/integration/tools/api/checklists/get/get-checklist.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-checklist integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить чеклист задачи', async () => {
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
      issueId: issueKey,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.checklist).toBeDefined();
    expect(Array.isArray(response.data.checklist)).toBe(true);
    expect(response.data.checklist.length).toBe(3);
    expect(response.data.itemsCount).toBe(3);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить пустой чеклист', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    mockServer.mockGetChecklistSuccess(issueKey, []);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_checklist', {
      issueId: issueKey,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.checklist).toBeDefined();
    expect(Array.isArray(response.data.checklist)).toBe(true);
    expect(response.data.checklist.length).toBe(0);
    expect(response.data.itemsCount).toBe(0);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockGetChecklist404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_checklist', {
      issueId: issueKey,
    });

    // Assert
    expect(result.isError).toBe(true);
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
      issueId: issueKey,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.checklist).toBeDefined();
    expect(response.data.checklist.length).toBe(5);
    expect(response.data.itemsCount).toBe(5);
    // Проверяем, что все элементы не выполнены
    response.data.checklist.forEach((item: { checked: boolean }) => {
      expect(item.checked).toBe(false);
    });
    mockServer.assertAllRequestsDone();
  });
});
