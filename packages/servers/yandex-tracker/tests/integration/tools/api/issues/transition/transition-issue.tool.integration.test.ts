// tests/integration/mcp/tools/api/issues/transition/transition-issue.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('transition-issue integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен выполнить переход задачи', async () => {
    // Arrange
    const issueKey = 'TEST-200';
    const transitionId = 'start';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    // Act
    const result = await client.callTool('transition_issue', {
      issueKey,
      transitionId,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.issue.key).toBe(issueKey);
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить переход с комментарием', async () => {
    // Arrange
    const issueKey = 'TEST-201';
    const transitionId = 'close';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    // Act
    const result = await client.callTool('transition_issue', {
      issueKey,
      transitionId,
      comment: 'Closing as completed',
    });

    // Assert
    expect(result.isError).toBeUndefined();
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача или переход не найдены)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    const transitionId = 'start';
    mockServer.mockTransitionIssue404(issueKey, transitionId);

    // Act
    const result = await client.callTool('transition_issue', {
      issueKey,
      transitionId,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить переход с фильтрацией полей', async () => {
    // Arrange
    const issueKey = 'TEST-202';
    const transitionId = 'resolve';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    // Act
    const result = await client.callTool('transition_issue', {
      issueKey,
      transitionId,
      fields: ['key', 'status'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.issue).toHaveProperty('key');
    mockServer.assertAllRequestsDone();
  });
});
