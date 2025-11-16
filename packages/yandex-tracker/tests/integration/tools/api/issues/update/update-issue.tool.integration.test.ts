// tests/integration/mcp/tools/api/issues/update/update-issue.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('update-issue integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен обновить задачу с одним полем', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    mockServer.mockUpdateIssueSuccess(issueKey, {
      summary: 'Updated summary',
    });

    // Act
    const result = await client.callTool('update_issue', {
      issueKey,
      summary: 'Updated summary',
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.issue.key).toBe(issueKey);
    expect(response.data.issue.summary).toBe('Updated summary');
    mockServer.assertAllRequestsDone();
  });

  it('должен обновить несколько полей', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    mockServer.mockUpdateIssueSuccess(issueKey, {
      summary: 'New summary',
      description: 'New description',
      priority: { key: 'critical' },
    });

    // Act
    const result = await client.callTool('update_issue', {
      issueKey,
      summary: 'New summary',
      description: 'New description',
      priority: 'critical',
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.issue.summary).toBe('New summary');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockUpdateIssue404(issueKey);

    // Act
    const result = await client.callTool('update_issue', {
      issueKey,
      summary: 'Test',
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен обновить задачу с фильтрацией полей', async () => {
    // Arrange
    const issueKey = 'TEST-102';
    mockServer.mockUpdateIssueSuccess(issueKey, { summary: 'Updated' });

    // Act
    const result = await client.callTool('update_issue', {
      issueKey,
      summary: 'Updated',
      fields: ['key', 'summary'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.issue).toHaveProperty('key');
    expect(response.data.issue).toHaveProperty('summary');
    mockServer.assertAllRequestsDone();
  });
});
