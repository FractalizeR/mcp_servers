// tests/integration/tools/api/comments/add/add-comment.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('add-comment integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен добавить комментарий к задаче', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const commentText = 'Test comment';
    mockServer.mockAddCommentSuccess(issueKey, {
      text: commentText,
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_add_comment', {
      issueId: issueKey,
      text: commentText,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.comment).toBeDefined();
    expect(response.data.comment.text).toBe(commentText);
    mockServer.assertAllRequestsDone();
  });

  it('должен добавить комментарий с вложениями', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const commentText = 'Comment with attachments';
    const attachmentIds = ['att-1', 'att-2'];
    mockServer.mockAddCommentSuccess(issueKey, {
      text: commentText,
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_add_comment', {
      issueId: issueKey,
      text: commentText,
      attachmentIds,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.comment).toBeDefined();
    expect(response.data.comment.text).toBe(commentText);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockAddComment404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_add_comment', {
      issueId: issueKey,
      text: 'Test comment',
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен добавить комментарий с markdown форматированием', async () => {
    // Arrange
    const issueKey = 'TEST-102';
    const markdownText = '## Update\n\nNew feature added.';
    mockServer.mockAddCommentSuccess(issueKey, {
      text: markdownText,
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_add_comment', {
      issueId: issueKey,
      text: markdownText,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.comment.text).toBe(markdownText);
    mockServer.assertAllRequestsDone();
  });
});
