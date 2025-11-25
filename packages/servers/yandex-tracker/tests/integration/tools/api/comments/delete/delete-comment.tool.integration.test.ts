// tests/integration/tools/api/comments/delete/delete-comment.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';

describe('delete-comment integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен удалить комментарий (batch)', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const commentId = 'comment-123';
    mockServer.mockDeleteCommentSuccess(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_comment', {
      comments: [{ issueId: issueKey, commentId }],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.successful).toHaveLength(1);
    expect(response.data.successful[0].success).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (комментарий не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const commentId = 'nonexistent-comment';
    mockServer.mockDeleteComment404(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_comment', {
      comments: [{ issueId: issueKey, commentId }],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.failed).toHaveLength(1);
    mockServer.assertAllRequestsDone();
  });

  it('должен удалить несколько комментариев', async () => {
    // Arrange
    const issueKey1 = 'TEST-102';
    const commentId1 = 'valid-comment-id-456';
    const issueKey2 = 'TEST-103';
    const commentId2 = 'valid-comment-id-789';
    mockServer.mockDeleteCommentSuccess(issueKey1, commentId1);
    mockServer.mockDeleteCommentSuccess(issueKey2, commentId2);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_comment', {
      comments: [
        { issueId: issueKey1, commentId: commentId1 },
        { issueId: issueKey2, commentId: commentId2 },
      ],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(2);
    expect(response.data.successful).toHaveLength(2);
    expect(response.data.failed).toHaveLength(0);
    mockServer.assertAllRequestsDone();
  });
});
