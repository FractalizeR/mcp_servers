// tests/integration/tools/api/issues/links/delete/delete-link.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';

describe('delete-link integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен удалить связь между задачами', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const linkId = 'link123';
    mockServer.mockDeleteLinkSuccess(issueKey, linkId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_link', {
      links: [
        {
          issueId: issueKey,
          linkId,
        },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.total).toBe(1);
    expect(response.data.successful).toHaveLength(1);
    expect(response.data.successful[0].issueId).toBe(issueKey);
    expect(response.data.successful[0].linkId).toBe(linkId);
    expect(response.data.successful[0].success).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (связь не найдена)', async () => {
    // Arrange
    const issueKey = 'TEST-200';
    const linkId = 'nonexistent-link';
    mockServer.mockDeleteLink404(issueKey, linkId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_link', {
      links: [
        {
          issueId: issueKey,
          linkId,
        },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.failed).toHaveLength(1);
    expect(response.data.failed[0].issueId).toBe(issueKey);
    expect(response.data.failed[0].linkId).toBe(linkId);
    expect(response.data.failed[0].error).toBeDefined();
    mockServer.assertAllRequestsDone();
  });

  it('должен удалить несколько связей в одном batch запросе', async () => {
    // Arrange
    const issueKey = 'TEST-300';
    const link1 = 'link1';
    const link2 = 'link2';
    const link3 = 'link3';

    mockServer.mockDeleteLinkSuccess(issueKey, link1);
    mockServer.mockDeleteLinkSuccess(issueKey, link2);
    mockServer.mockDeleteLinkSuccess(issueKey, link3);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_link', {
      links: [
        { issueId: issueKey, linkId: link1 },
        { issueId: issueKey, linkId: link2 },
        { issueId: issueKey, linkId: link3 },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(3);
    expect(response.data.successful).toHaveLength(3);
    mockServer.assertAllRequestsDone();
  });

  it('должен удалить связь из разных задач в одном batch запросе', async () => {
    // Arrange
    const issue1 = 'PROJ-1';
    const issue2 = 'PROJ-2';
    const linkId1 = 'link-a';
    const linkId2 = 'link-b';

    mockServer.mockDeleteLinkSuccess(issue1, linkId1);
    mockServer.mockDeleteLinkSuccess(issue2, linkId2);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_link', {
      links: [
        { issueId: issue1, linkId: linkId1 },
        { issueId: issue2, linkId: linkId2 },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(2);
    expect(response.data.successful).toHaveLength(2);
    expect(response.data.successful[0].issueId).toBe(issue1);
    expect(response.data.successful[1].issueId).toBe(issue2);
    mockServer.assertAllRequestsDone();
  });

  it('должен вернуть корректное сообщение об успехе', async () => {
    // Arrange
    const issueKey = 'TEST-400';
    const linkId = 'link999';
    mockServer.mockDeleteLinkSuccess(issueKey, linkId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_link', {
      links: [
        {
          issueId: issueKey,
          linkId,
        },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.total).toBe(1);
    expect(response.data.successful).toHaveLength(1);
    expect(response.data.successful[0].issueId).toBe(issueKey);
    expect(response.data.successful[0].linkId).toBe(linkId);
    mockServer.assertAllRequestsDone();
  });
});
