// tests/integration/mcp/tools/api/issues/changelog/get-issue-changelog.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-issue-changelog integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить changelog задачи', async () => {
    // Arrange
    const issueKey = 'TEST-300';
    mockServer.mockGetChangelogSuccess(issueKey);

    // Act
    const result = await client.callTool('get_issue_changelog', {
      issueKey,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data).toHaveProperty('changelog');
    expect(Array.isArray(response.data.changelog)).toBe(true);
    expect(response.data.changelog.length).toBeGreaterThan(0);

    const entry = response.data.changelog[0];
    expect(entry).toHaveProperty('updatedAt');
    expect(entry).toHaveProperty('updatedBy');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockGetChangelog404(issueKey);

    // Act
    const result = await client.callTool('get_issue_changelog', {
      issueKey,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить changelog с фильтрацией полей', async () => {
    // Arrange
    const issueKey = 'TEST-301';
    mockServer.mockGetChangelogSuccess(issueKey);

    // Act
    const result = await client.callTool('get_issue_changelog', {
      issueKey,
      fields: ['id', 'updatedAt', 'updatedBy'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.changelog).toBeDefined();
    mockServer.assertAllRequestsDone();
  });
});
