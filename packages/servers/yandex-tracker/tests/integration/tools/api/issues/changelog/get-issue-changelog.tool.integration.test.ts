// tests/integration/mcp/tools/api/issues/changelog/get-issue-changelog.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_CHANGELOG_FIELDS } from '#helpers/test-fields.js';

describe('get-issue-changelog integration tests (batch mode)', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить changelog нескольких задач (batch)', async () => {
    // Arrange
    const issueKeys = ['TEST-300', 'TEST-301'];
    mockServer.mockGetChangelogSuccess(issueKeys[0]!);
    mockServer.mockGetChangelogSuccess(issueKeys[1]!);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_changelog', {
      issueKeys,
      fields: STANDARD_CHANGELOG_FIELDS,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data).toHaveProperty('successful');
    expect(response.data).toHaveProperty('failed');
    expect(response.data.total).toBe(2);
    expect(response.data.successful.length).toBe(2);
    expect(response.data.failed.length).toBe(0);

    const firstResult = response.data.successful[0];
    expect(firstResult).toHaveProperty('issueKey');
    expect(firstResult).toHaveProperty('changelog');
    expect(firstResult).toHaveProperty('totalEntries');
    expect(Array.isArray(firstResult.changelog)).toBe(true);

    mockServer.assertAllRequestsDone();
  });

  it('должен обработать частичные ошибки (некоторые задачи не найдены)', async () => {
    // Arrange
    const issueKeys = ['TEST-300', 'NONEXISTENT-1'];
    mockServer.mockGetChangelogSuccess(issueKeys[0]!);
    mockServer.mockGetChangelog404(issueKeys[1]!);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_changelog', {
      issueKeys,
      fields: STANDARD_CHANGELOG_FIELDS,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(2);
    expect(response.data.successful.length).toBe(1);
    expect(response.data.failed.length).toBe(1);

    const failedResult = response.data.failed[0];
    expect(failedResult).toHaveProperty('key');
    expect(failedResult).toHaveProperty('error');

    mockServer.assertAllRequestsDone();
  });

  it('должен получить changelog с фильтрацией полей', async () => {
    // Arrange
    const issueKeys = ['TEST-301'];
    mockServer.mockGetChangelogSuccess(issueKeys[0]!);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_changelog', {
      issueKeys,
      fields: ['id', 'updatedAt', 'updatedBy'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.successful).toBeDefined();
    expect(response.data.successful.length).toBe(1);
    expect(response.data.successful[0].changelog).toBeDefined();
    mockServer.assertAllRequestsDone();
  });
});
