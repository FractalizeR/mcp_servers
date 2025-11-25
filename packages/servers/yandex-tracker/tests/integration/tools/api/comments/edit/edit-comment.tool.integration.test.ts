// tests/integration/tools/api/comments/edit/edit-comment.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';

describe('edit-comment integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен редактировать комментарий (batch)', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const commentId = 'comment-123';
    const updatedText = 'Updated comment text';
    mockServer.mockEditCommentSuccess(issueKey, commentId, {
      text: updatedText,
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      comments: [{ issueId: issueKey, commentId, text: updatedText }],
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.successful).toHaveLength(1);
    expect(response.data.successful[0].comment.id).toBe(commentId);
    expect(response.data.successful[0].comment.text).toBe(updatedText);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (комментарий не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const commentId = 'nonexistent-comment';
    mockServer.mockEditComment404(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      comments: [{ issueId: issueKey, commentId, text: 'Some text' }],
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.failed).toHaveLength(1);
    mockServer.assertAllRequestsDone();
  });

  it('должен редактировать несколько комментариев', async () => {
    // Arrange
    const issueKey1 = 'TEST-102';
    const commentId1 = 'comment-456';
    const issueKey2 = 'TEST-103';
    const commentId2 = 'comment-789';
    mockServer.mockEditCommentSuccess(issueKey1, commentId1, {
      text: 'Updated text 1',
    });
    mockServer.mockEditCommentSuccess(issueKey2, commentId2, {
      text: 'Updated text 2',
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      comments: [
        { issueId: issueKey1, commentId: commentId1, text: 'Updated text 1' },
        { issueId: issueKey2, commentId: commentId2, text: 'Updated text 2' },
      ],
      fields: ['id', 'text'],
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
