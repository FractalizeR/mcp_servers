// tests/integration/tools/api/comments/delete/delete-comment.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

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

  it('должен удалить комментарий', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const commentId = 'comment-123';
    mockServer.mockDeleteCommentSuccess(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_comment', {
      issueId: issueKey,
      commentId,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.success).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (комментарий не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const commentId = 'nonexistent-comment';
    mockServer.mockDeleteComment404(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_comment', {
      issueId: issueKey,
      commentId,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен удалить комментарий с валидным ID', async () => {
    // Arrange
    const issueKey = 'TEST-102';
    const commentId = 'valid-comment-id-456';
    mockServer.mockDeleteCommentSuccess(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_delete_comment', {
      issueId: issueKey,
      commentId,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.success).toBe(true);
    mockServer.assertAllRequestsDone();
  });
});
