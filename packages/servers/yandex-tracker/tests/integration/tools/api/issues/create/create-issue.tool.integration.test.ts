// tests/integration/mcp/tools/api/issues/create/create-issue.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('create-issue integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен создать задачу с минимальными полями', async () => {
    // Arrange
    mockServer.mockCreateIssueSuccess({
      key: 'TEST-1',
      queue: { key: 'TEST' },
      summary: 'Test issue',
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_issue', {
      queue: 'TEST',
      summary: 'Test issue',
      fields: STANDARD_ISSUE_FIELDS,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.success).toBe(true);
    expect(response.data.issue).toHaveProperty('key');
    expect(response.data.issue.key).toBe('TEST-1');
    mockServer.assertAllRequestsDone();
  });

  it('должен создать задачу со всеми полями', async () => {
    // Arrange
    const issueData = {
      key: 'TEST-2',
      queue: { key: 'TEST' },
      summary: 'Full issue',
      description: 'Detailed description',
      priority: { key: 'critical' },
      assignee: { login: 'user1' },
    };

    mockServer.mockCreateIssueSuccess(issueData);

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_issue', {
      queue: 'TEST',
      summary: 'Full issue',
      description: 'Detailed description',
      priority: 'critical',
      assignee: 'user1',
      fields: STANDARD_ISSUE_FIELDS,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.data.issue.key).toBe('TEST-2');
    expect(response.data.issue.summary).toBe('Full issue');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 403 (доступ запрещён)', async () => {
    // Arrange
    mockServer.mockCreateIssue403();

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_issue', {
      queue: 'TEST',
      summary: 'Test',
      fields: STANDARD_ISSUE_FIELDS,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен создать задачу с фильтрацией полей', async () => {
    // Arrange
    mockServer.mockCreateIssueSuccess({
      key: 'TEST-3',
      queue: { key: 'TEST' },
      summary: 'Filtered issue',
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_issue', {
      queue: 'TEST',
      summary: 'Filtered issue',
      fields: ['key', 'summary'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.data.issue).toHaveProperty('key');
    expect(response.data.issue).toHaveProperty('summary');
    mockServer.assertAllRequestsDone();
  });
});
