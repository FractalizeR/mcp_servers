// tests/integration/tools/api/comments/edit/edit-comment.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

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

  it('должен редактировать комментарий', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const commentId = 'comment-123';
    const updatedText = 'Updated comment text';
    mockServer.mockEditCommentSuccess(issueKey, commentId, {
      text: updatedText,
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      issueId: issueKey,
      commentId,
      text: updatedText,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.comment).toBeDefined();
    expect(response.data.comment.id).toBe(commentId);
    expect(response.data.comment.text).toBe(updatedText);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (комментарий не найден)', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    const commentId = 'nonexistent-comment';
    mockServer.mockEditComment404(issueKey, commentId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      issueId: issueKey,
      commentId,
      text: 'Some text',
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен редактировать комментарий с markdown форматированием', async () => {
    // Arrange
    const issueKey = 'TEST-102';
    const commentId = 'comment-456';
    const markdownText = '### Updated\n\n- Item 1\n- Item 2';
    mockServer.mockEditCommentSuccess(issueKey, commentId, {
      text: markdownText,
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      issueId: issueKey,
      commentId,
      text: markdownText,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.comment.text).toBe(markdownText);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать редактирование с пустым текстом', async () => {
    // Arrange
    const issueKey = 'TEST-103';
    const commentId = 'comment-789';
    mockServer.mockEditCommentSuccess(issueKey, commentId, {
      text: '',
    });

    // Act
    const result = await client.callTool('fr_yandex_tracker_edit_comment', {
      issueId: issueKey,
      commentId,
      text: '',
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.comment.text).toBe('');
    mockServer.assertAllRequestsDone();
  });
});
